import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { Hono } from 'hono'

/**
 * GET /accounts/:id/statement on a real, migrated Postgres (opt-in like the other
 * integration tests):
 *
 *   TEST_DATABASE_URL=postgres://… pnpm --filter @finance-tdah/api test
 */
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL

vi.mock('../env', () => ({
  env: { DATABASE_URL: process.env.TEST_DATABASE_URL ?? 'postgres://unused', NODE_ENV: 'test' },
  features: { passwordResetEmail: false, webPush: false },
}))

vi.mock('../middleware/session', () => ({
  sessionMiddleware: async (
    c: { req: { header: (k: string) => string | undefined }; set: (k: string, v: unknown) => void },
    next: () => Promise<void>,
  ) => {
    c.set('user', { id: c.req.header('x-test-user') })
    await next()
  },
}))

vi.mock('../services/push-sender', () => ({ sendPushToUser: vi.fn() }))

describe.skipIf(!TEST_DATABASE_URL)('credit card statement (Postgres)', async () => {
  const { db, schema } = await import('../db/client')
  const { accountsRoute } = await import('./accounts')
  const { inArray } = await import('drizzle-orm')

  const app = new Hono().route('/accounts', accountsRoute)
  const run = `s${Date.now()}`
  const ANA = `${run}-ana`
  const BEN = `${run}-ben`

  const get = (id: string, user = ANA) =>
    app.request(`/accounts/${id}/statement`, { headers: { 'x-test-user': user } })

  const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000)

  async function card(extra: Record<string, unknown> = {}) {
    const [row] = await db
      .insert(schema.financialAccount)
      .values({
        userId: ANA,
        name: `card-${Math.random()}`,
        type: 'credito',
        // The statement closed 5 days ago, so anything bought today is in the open period
        // whatever day the suite runs on.
        cutoffDay: daysAgo(5).getUTCDate(),
        paymentDay: 25,
        ...extra,
      })
      .returning()
    return row
  }

  const move = (accountId: string, kind: 'expense' | 'income', amountCents: number, occurredAt: Date) => ({
    userId: ANA,
    accountId,
    kind,
    amountCents,
    occurredAt,
    category: 'otros',
    description: 'test',
  })

  beforeEach(async () => {
    await db.delete(schema.user).where(inArray(schema.user.id, [ANA, BEN]))
    await db.insert(schema.user).values([
      { id: ANA, name: 'Ana', email: `${ANA}@test.local` },
      { id: BEN, name: 'Ben', email: `${BEN}@test.local` },
    ])
  })

  afterAll(async () => {
    await db.delete(schema.user).where(inArray(schema.user.id, [ANA, BEN]))
  })

  it('counts a purchase made long ago as nothing due and a fresh one as open period', async () => {
    const c = await card()
    await db.insert(schema.expense).values([
      move(c.id, 'expense', 70_000, daysAgo(1)),
      move(c.id, 'expense', 5_000, daysAgo(200)),
    ])
    const res = await get(c.id)
    expect(res.status).toBe(200)
    const { statement } = (await res.json()) as { statement: { dueCents: number; openPeriodCents: number } }
    // The 200-day-old purchase is outside the window and never counts.
    expect(statement.dueCents + statement.openPeriodCents).toBe(70_000)
  })

  it('rejects an account without statement days and one from another user', async () => {
    const noDays = await card({ cutoffDay: null, paymentDay: null })
    expect((await get(noDays.id)).status).toBe(422)
    const c = await card()
    expect((await get(c.id, BEN)).status).toBe(404)
  })

  it('rejects a non-credit account', async () => {
    const debit = await card({ type: 'debito' })
    expect((await get(debit.id)).status).toBe(422)
  })

  it('treats a payment into the card as a payment, not a purchase', async () => {
    const c = await card()
    await db.insert(schema.expense).values([
      move(c.id, 'income', 10_000, daysAgo(0)),
      move(c.id, 'expense', 30_000, daysAgo(0)),
    ])
    const { statement } = (await (await get(c.id)).json()) as { statement: { openPeriodCents: number } }
    expect(statement.openPeriodCents).toBe(30_000)
  })
})
