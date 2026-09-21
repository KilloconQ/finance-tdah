import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Hono } from 'hono'

// Plain marker columns: drizzle's eq/and/isNull only need object identity to
// build query fragments, not real Column instances — good enough to
// introspect which condition/patch a query targets without a live Postgres
// to execute the SQL against.
const { goal, state, fakeDb } = vi.hoisted(() => {
  const goal = {
    id: { name: 'goal.id' },
    userId: { name: 'goal.user_id' },
    archivedAt: { name: 'goal.archived_at' },
  }

  const state: {
    updatedRow: Record<string, unknown> | null
    updateCalls: Array<{ setArg: Record<string, unknown>; whereArg: unknown }>
  } = {
    updatedRow: null,
    updateCalls: [],
  }

  const fakeDb = {
    update: () => ({
      set: (setArg: Record<string, unknown>) => ({
        where: (whereArg: unknown) => {
          state.updateCalls.push({ setArg, whereArg })
          return {
            returning: async () => (state.updatedRow ? [state.updatedRow] : []),
          }
        },
      }),
    }),
  }

  return { goal, state, fakeDb }
})

vi.mock('../middleware/session', () => ({
  sessionMiddleware: async (c: { set: (k: string, v: unknown) => void }, next: () => Promise<void>) => {
    c.set('user', { id: 'user-1' })
    await next()
  },
}))

vi.mock('../db/client', () => ({
  schema: { goal },
  db: fakeDb,
}))

const { goalsRoute } = await import('./goals')
const app = new Hono().route('/', goalsRoute)

// idParamSchema validates the :id param as a UUID, so path ids must look
// like one even though the fake db never actually looks them up.
const GOAL_ID = '11111111-1111-4111-8111-111111111111'
const OTHER_ID = '22222222-2222-4222-8222-222222222222'

function deleteGoal(id: string) {
  return app.request(`/${id}`, { method: 'DELETE' })
}

// Walks a drizzle SQL/condition fragment and returns its literal leaves
// (column markers and interpolated values), skipping the string glue — this
// is how we confirm isNull(goal.archivedAt) is part of the where condition
// without a database to actually run it against.
function leaves(node: unknown, out: unknown[] = []): unknown[] {
  const ctor = (node as { constructor?: { name?: string } } | null)?.constructor?.name
  if (ctor === 'SQL') {
    for (const chunk of (node as { queryChunks: unknown[] }).queryChunks) leaves(chunk, out)
  } else if (ctor !== 'StringChunk') {
    out.push(node)
  }
  return out
}

describe('DELETE /goals/:id soft-archives instead of hard-deleting', () => {
  beforeEach(() => {
    state.updatedRow = null
    state.updateCalls = []
  })

  it('sets archivedAt to a Date and returns ok', async () => {
    state.updatedRow = {
      id: GOAL_ID,
      userId: 'user-1',
      archivedAt: new Date(),
    }

    const res = await deleteGoal(GOAL_ID)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual({ ok: true })
    expect(state.updateCalls).toHaveLength(1)
    expect(state.updateCalls[0].setArg.archivedAt).toBeInstanceOf(Date)
    expect(state.updateCalls[0].setArg.archivedAt).not.toBeNull()
  })

  it('scopes the update to unarchived rows', async () => {
    state.updatedRow = {
      id: GOAL_ID,
      userId: 'user-1',
      archivedAt: new Date(),
    }

    await deleteGoal(GOAL_ID)

    const flat = leaves(state.updateCalls[0].whereArg)
    expect(flat).toContain(goal.archivedAt)
  })

  it('404s and updates no row when the goal is already archived or not found', async () => {
    state.updatedRow = null

    const res = await deleteGoal(OTHER_ID)
    const body = await res.json()

    expect(res.status).toBe(404)
    expect(body).toEqual({ error: 'Frasco no encontrado' })
    expect(state.updateCalls).toHaveLength(1)
  })
})
