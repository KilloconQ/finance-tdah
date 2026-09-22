import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Hono } from 'hono'

// Plain marker columns: drizzle's eq/and/sql only need object identity to
// build query fragments, not real Column instances — good enough to
// introspect which account and delta a query fragment targets without a
// live Postgres to execute the SQL against.
const { financialAccount, expense, state, fakeDb, sendPushToUser } = vi.hoisted(() => {
  const financialAccount = {
    id: { name: 'financial_account.id' },
    userId: { name: 'financial_account.user_id' },
    balanceCents: { name: 'financial_account.balance_cents' },
    updatedAt: { name: 'financial_account.updated_at' },
  }
  const expense = {
    id: { name: 'expense.id' },
    userId: { name: 'expense.user_id' },
    kind: { name: 'expense.kind' },
    amountCents: { name: 'expense.amount_cents' },
    occurredAt: { name: 'expense.occurred_at' },
  }

  const state: {
    expenseRow: Record<string, unknown> | null
    updateCalls: Array<{ whereArg: unknown; setArg: { balanceCents: unknown } }>
    profile: Record<string, unknown> | null
    weekSumCents: number | null
  } = {
    expenseRow: null,
    updateCalls: [],
    profile: null,
    weekSumCents: null,
  }

  const fakeTx = {
    insert: () => ({
      values: (values: Record<string, unknown>) => ({
        returning: async () => [{ id: 'expense-1', ...values }],
      }),
    }),
    delete: () => ({
      where: () => ({
        returning: async () => (state.expenseRow ? [state.expenseRow] : []),
      }),
    }),
    update: () => ({
      set: (setArg: { balanceCents: unknown }) => ({
        where: (whereArg: unknown) => {
          state.updateCalls.push({ whereArg, setArg })
          return Promise.resolve([])
        },
      }),
    }),
  }

  const fakeDb = {
    transaction: (cb: (tx: unknown) => unknown) => cb(fakeTx),
    query: {
      userProfile: {
        findFirst: async () => state.profile,
      },
    },
    select: () => ({
      from: () => ({
        where: async () => [{ sum: state.weekSumCents === null ? null : String(state.weekSumCents) }],
      }),
    }),
  }

  const sendPushToUser = vi.fn()

  return { financialAccount, expense, state, fakeDb, sendPushToUser }
})

vi.mock('../middleware/session', () => ({
  sessionMiddleware: async (c: { set: (k: string, v: unknown) => void }, next: () => Promise<void>) => {
    c.set('user', { id: 'user-1' })
    await next()
  },
}))

vi.mock('../db/client', () => ({
  schema: { expense, financialAccount },
  db: fakeDb,
}))

vi.mock('../services/voice-parser', () => ({
  parseVoiceTranscript: () => null,
}))

vi.mock('../services/push-sender', () => ({
  sendPushToUser,
}))

vi.mock('../env', () => ({
  env: { NODE_ENV: 'test' },
}))

const { expensesRoute } = await import('./expenses')
const app = new Hono().route('/', expensesRoute)

// idParamSchema validates the :id param as a UUID, so path ids must look
// like one even though the fake tx never actually looks them up.
const EXPENSE_ID = '11111111-1111-4111-8111-111111111111'
const OTHER_ID = '22222222-2222-4222-8222-222222222222'

function deleteExpense(id: string) {
  return app.request(`/${id}`, { method: 'DELETE' })
}

function createExpense(body: Record<string, unknown>) {
  return app.request('/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// Walks a drizzle SQL/condition fragment and returns its literal leaves
// (column markers and interpolated values), skipping the string glue —
// this is how we read back "which account" and "which delta" a query
// targets without a database to actually run it against.
function leaves(node: unknown, out: unknown[] = []): unknown[] {
  const ctor = (node as { constructor?: { name?: string } } | null)?.constructor?.name
  if (ctor === 'SQL') {
    for (const chunk of (node as { queryChunks: unknown[] }).queryChunks) leaves(chunk, out)
  } else if (ctor !== 'StringChunk') {
    out.push(node)
  }
  return out
}

function targetAccountId(whereArg: unknown): unknown {
  const flat = leaves(whereArg)
  const idx = flat.indexOf(financialAccount.id)
  return idx === -1 ? undefined : flat[idx + 1]
}

function balanceDelta(setArg: { balanceCents: unknown }): unknown {
  return leaves(setArg.balanceCents)[1]
}

describe('DELETE /expenses/:id reverses the balance movement it caused', () => {
  beforeEach(() => {
    state.expenseRow = null
    state.updateCalls = []
  })

  it('gives the money back for an expense', async () => {
    state.expenseRow = {
      id: EXPENSE_ID,
      kind: 'expense',
      amountCents: 5_000,
      accountId: 'acc-1',
      toAccountId: null,
    }

    const res = await deleteExpense(EXPENSE_ID)

    expect(res.status).toBe(200)
    expect(state.updateCalls).toHaveLength(1)
    expect(targetAccountId(state.updateCalls[0].whereArg)).toBe('acc-1')
    // balance - (-5000) === balance + 5000: the expense is undone.
    expect(balanceDelta(state.updateCalls[0].setArg)).toBe(-5_000)
  })

  it('takes the money back out for an income', async () => {
    state.expenseRow = {
      id: EXPENSE_ID,
      kind: 'income',
      amountCents: 5_000,
      accountId: 'acc-1',
      toAccountId: null,
    }

    const res = await deleteExpense(EXPENSE_ID)

    expect(res.status).toBe(200)
    expect(state.updateCalls).toHaveLength(1)
    expect(targetAccountId(state.updateCalls[0].whereArg)).toBe('acc-1')
    // balance - 5000: the income is undone.
    expect(balanceDelta(state.updateCalls[0].setArg)).toBe(5_000)
  })

  it('reverses a transfer on both the source and destination accounts', async () => {
    state.expenseRow = {
      id: EXPENSE_ID,
      kind: 'transfer',
      amountCents: 5_000,
      accountId: 'acc-1',
      toAccountId: 'acc-2',
    }

    const res = await deleteExpense(EXPENSE_ID)

    expect(res.status).toBe(200)
    expect(state.updateCalls).toHaveLength(2)
    expect(targetAccountId(state.updateCalls[0].whereArg)).toBe('acc-1')
    expect(balanceDelta(state.updateCalls[0].setArg)).toBe(-5_000)
    expect(targetAccountId(state.updateCalls[1].whereArg)).toBe('acc-2')
    expect(balanceDelta(state.updateCalls[1].setArg)).toBe(5_000)
  })

  it('touches no account and 404s when the expense is not found', async () => {
    state.expenseRow = null

    const res = await deleteExpense(OTHER_ID)

    expect(res.status).toBe(404)
    expect(state.updateCalls).toHaveLength(0)
  })
})

describe('POST /expenses sends a weekly-budget push only on the crossing moment', () => {
  beforeEach(() => {
    sendPushToUser.mockClear()
    state.profile = { weeklyBudgetCents: 10_000 }
  })

  function expenseBody(amountCents: number, kind: 'expense' | 'income' = 'expense') {
    return { amountCents, category: 'food', description: 'lunch', kind }
  }

  it('notifies when this expense pushes the week total past the target', async () => {
    state.weekSumCents = 12_000 // after; before = 12_000 - 5_000 = 7_000 < 10_000 target

    const res = await createExpense(expenseBody(5_000))

    expect(res.status).toBe(201)
    expect(sendPushToUser).toHaveBeenCalledTimes(1)
    expect(sendPushToUser).toHaveBeenCalledWith('user-1', expect.objectContaining({ title: expect.any(String) }))
  })

  it('does not re-notify when already over budget before this expense', async () => {
    state.weekSumCents = 20_000 // after; before = 15_000, already >= 10_000 target

    const res = await createExpense(expenseBody(5_000))

    expect(res.status).toBe(201)
    expect(sendPushToUser).not.toHaveBeenCalled()
  })

  it('does not notify when still under budget after this expense', async () => {
    state.weekSumCents = 8_000 // after; before = 5_000, after = 8_000 < 10_000 target

    const res = await createExpense(expenseBody(3_000))

    expect(res.status).toBe(201)
    expect(sendPushToUser).not.toHaveBeenCalled()
  })

  it('does not notify for an income entry even if the week total crosses the target', async () => {
    state.weekSumCents = 12_000

    const res = await createExpense(expenseBody(5_000, 'income'))

    expect(res.status).toBe(201)
    expect(sendPushToUser).not.toHaveBeenCalled()
  })
})
