import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Hono } from 'hono'

const { pushSubscription, state, fakeDb } = vi.hoisted(() => {
  const pushSubscription = {
    id: { name: 'push_subscription.id' },
    userId: { name: 'push_subscription.user_id' },
    endpoint: { name: 'push_subscription.endpoint' },
  }

  const state: {
    insertedRow: Record<string, unknown> | null
    deletedRow: Record<string, unknown> | null
    insertCalls: Array<{ valuesArg: Record<string, unknown>; conflictArg: unknown }>
    deleteCalls: Array<{ whereArg: unknown }>
  } = {
    insertedRow: null,
    deletedRow: null,
    insertCalls: [],
    deleteCalls: [],
  }

  const fakeDb = {
    insert: () => ({
      values: (valuesArg: Record<string, unknown>) => ({
        onConflictDoUpdate: (conflictArg: unknown) => {
          state.insertCalls.push({ valuesArg, conflictArg })
          return {
            returning: async () => (state.insertedRow ? [state.insertedRow] : []),
          }
        },
      }),
    }),
    delete: () => ({
      where: (whereArg: unknown) => {
        state.deleteCalls.push({ whereArg })
        return {
          returning: async () => (state.deletedRow ? [state.deletedRow] : []),
        }
      },
    }),
  }

  return { pushSubscription, state, fakeDb }
})

vi.mock('../env', () => ({
  env: {},
  features: { passwordResetEmail: true, webPush: true },
}))

vi.mock('../middleware/session', () => ({
  sessionMiddleware: async (c: { set: (k: string, v: unknown) => void }, next: () => Promise<void>) => {
    c.set('user', { id: 'user-1' })
    await next()
  },
}))

vi.mock('../db/client', () => ({
  schema: { pushSubscription },
  db: fakeDb,
}))

const { pushRoute } = await import('./push')
const app = new Hono().route('/', pushRoute)

// Same fragment-walking helper as goals.test.ts — confirms a column marker is
// part of a drizzle where/conflict condition without a live Postgres.
function leaves(node: unknown, out: unknown[] = []): unknown[] {
  const ctor = (node as { constructor?: { name?: string } } | null)?.constructor?.name
  if (ctor === 'SQL') {
    for (const chunk of (node as { queryChunks: unknown[] }).queryChunks) leaves(chunk, out)
  } else if (ctor !== 'StringChunk') {
    out.push(node)
  }
  return out
}

function subscribe(body: unknown) {
  return app.request('/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function unsubscribe(body: unknown) {
  return app.request('/subscribe', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const VALID_SUBSCRIPTION = {
  endpoint: 'https://push.example.com/abc',
  keys: { p256dh: 'p256dh-key', auth: 'auth-key' },
}

describe('POST /push/subscribe', () => {
  beforeEach(() => {
    state.insertedRow = null
    state.insertCalls = []
  })

  it('upserts the subscription scoped to the authenticated user', async () => {
    state.insertedRow = { id: 'sub-1', userId: 'user-1', ...VALID_SUBSCRIPTION.keys }

    const res = await subscribe(VALID_SUBSCRIPTION)
    const body = await res.json()

    expect(res.status).toBe(201)
    expect(body).toEqual({ subscription: state.insertedRow })
    expect(state.insertCalls).toHaveLength(1)
    expect(state.insertCalls[0].valuesArg.userId).toBe('user-1')
    expect(state.insertCalls[0].valuesArg.endpoint).toBe(VALID_SUBSCRIPTION.endpoint)
  })

  it('rejects a payload missing keys', async () => {
    const res = await subscribe({ endpoint: VALID_SUBSCRIPTION.endpoint })

    expect(res.status).toBe(400)
    expect(state.insertCalls).toHaveLength(0)
  })
})

describe('DELETE /push/subscribe', () => {
  beforeEach(() => {
    state.deletedRow = null
    state.deleteCalls = []
  })

  it('deletes a subscription owned by the authenticated user', async () => {
    state.deletedRow = { id: 'sub-1', userId: 'user-1', endpoint: VALID_SUBSCRIPTION.endpoint }

    const res = await unsubscribe({ endpoint: VALID_SUBSCRIPTION.endpoint })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual({ ok: true })
  })

  it('scopes the delete to the authenticated user, not just the endpoint', async () => {
    state.deletedRow = { id: 'sub-1', userId: 'user-1', endpoint: VALID_SUBSCRIPTION.endpoint }

    await unsubscribe({ endpoint: VALID_SUBSCRIPTION.endpoint })

    const flat = leaves(state.deleteCalls[0].whereArg)
    expect(flat).toContain(pushSubscription.userId)
    expect(flat).toContain('user-1')
  })

  it("404s when the endpoint isn't owned by (or doesn't exist for) the authenticated user", async () => {
    state.deletedRow = null

    const res = await unsubscribe({ endpoint: 'https://push.example.com/someone-elses' })
    const body = await res.json()

    expect(res.status).toBe(404)
    expect(body).toEqual({ error: 'Suscripción no encontrada' })
  })
})
