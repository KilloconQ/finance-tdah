import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Hono } from 'hono'

// Plain marker columns: drizzle's eq/and only need object identity to build
// query fragments, not real Column instances — good enough for these tests,
// which never need to inspect the where clause, only capture what gets
// written.
const { financialAccount, state, fakeDb } = vi.hoisted(() => {
  const financialAccount = {
    id: { name: 'financial_account.id' },
    userId: { name: 'financial_account.user_id' },
    updatedAt: { name: 'financial_account.updated_at' },
  }

  const state: {
    insertedValues: Record<string, unknown> | null
    updateCalls: Array<{ setArg: Record<string, unknown> }>
    updateResult: Array<Record<string, unknown>>
    existingAccount: Record<string, unknown> | null
  } = {
    insertedValues: null,
    updateCalls: [],
    updateResult: [],
    existingAccount: null,
  }

  const fakeDb = {
    insert: () => ({
      values: (values: Record<string, unknown>) => ({
        returning: async () => {
          state.insertedValues = values
          return [{ id: 'acc-1', ...values }]
        },
      }),
    }),
    update: () => ({
      set: (setArg: Record<string, unknown>) => ({
        where: () => ({
          returning: async () => {
            state.updateCalls.push({ setArg })
            return state.updateResult
          },
        }),
      }),
    }),
    query: {
      financialAccount: {
        findFirst: async () => state.existingAccount,
        findMany: async () => [],
      },
    },
  }

  return { financialAccount, state, fakeDb }
})

vi.mock('../middleware/session', () => ({
  sessionMiddleware: async (c: { set: (k: string, v: unknown) => void }, next: () => Promise<void>) => {
    c.set('user', { id: 'user-1' })
    await next()
  },
}))

vi.mock('../db/client', () => ({
  schema: { financialAccount },
  db: fakeDb,
}))

const { accountsRoute } = await import('./accounts')
const app = new Hono().route('/', accountsRoute)

// idParamSchema validates the :id param as a UUID.
const ACCOUNT_ID = '33333333-3333-4333-8333-333333333333'

function postAccount(body: Record<string, unknown>) {
  return app.request('/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function patchAccount(id: string, body: Record<string, unknown>) {
  return app.request(`/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /accounts enforces the credit-debt sign invariant', () => {
  beforeEach(() => {
    state.insertedValues = null
  })

  it('stores a negative balanceCents for a credito account even when the payload is positive', async () => {
    const res = await postAccount({ name: 'Visa', type: 'credito', balanceCents: 5_000 })

    expect(res.status).toBe(201)
    const body = (await res.json()) as { account: { balanceCents: number } }
    expect(body.account.balanceCents).toBe(-5_000)
    expect(state.insertedValues?.balanceCents).toBe(-5_000)
  })

  it('keeps a positive balanceCents positive for a non-credito account (no regression)', async () => {
    const res = await postAccount({ name: 'Checking', type: 'debito', balanceCents: 5_000 })

    expect(res.status).toBe(201)
    const body = (await res.json()) as { account: { balanceCents: number } }
    expect(body.account.balanceCents).toBe(5_000)
    expect(state.insertedValues?.balanceCents).toBe(5_000)
  })
})

describe('PATCH /accounts/:id enforces the credit-debt sign invariant', () => {
  beforeEach(() => {
    state.updateCalls = []
    state.updateResult = []
    state.existingAccount = null
  })

  it('re-signs balanceCents negative when type is omitted but the existing account is credito', async () => {
    state.existingAccount = { id: ACCOUNT_ID, userId: 'user-1', type: 'credito' }
    state.updateResult = [{ id: ACCOUNT_ID, balanceCents: -3_000 }]

    const res = await patchAccount(ACCOUNT_ID, { balanceCents: 3_000 })

    expect(res.status).toBe(200)
    expect(state.updateCalls).toHaveLength(1)
    expect(state.updateCalls[0].setArg.balanceCents).toBe(-3_000)
  })

  it('re-signs balanceCents negative when both type and balanceCents are in the payload', async () => {
    state.updateResult = [{ id: ACCOUNT_ID, balanceCents: -3_000 }]

    const res = await patchAccount(ACCOUNT_ID, { type: 'credito', balanceCents: 3_000 })

    expect(res.status).toBe(200)
    expect(state.updateCalls).toHaveLength(1)
    expect(state.updateCalls[0].setArg.balanceCents).toBe(-3_000)
  })

  it('keeps balanceCents positive for a non-credito account (no regression)', async () => {
    state.existingAccount = { id: ACCOUNT_ID, userId: 'user-1', type: 'debito' }
    state.updateResult = [{ id: ACCOUNT_ID, balanceCents: 3_000 }]

    const res = await patchAccount(ACCOUNT_ID, { balanceCents: 3_000 })

    expect(res.status).toBe(200)
    expect(state.updateCalls).toHaveLength(1)
    expect(state.updateCalls[0].setArg.balanceCents).toBe(3_000)
  })

})
