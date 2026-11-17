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
  const { eq, inArray } = await import('drizzle-orm')

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
    const { statement } = (await res.json()) as {
      statement: { dueCents: number; openPeriodCents: number; today: string }
    }
    // The 200-day-old purchase is outside the window and never counts.
    expect(statement.dueCents + statement.openPeriodCents).toBe(70_000)
    // The day it was calculated for comes with it, so the web does not guess from its own clock.
    expect(statement.today).toMatch(/^\d{4}-\d{2}-\d{2}$/)
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

  describe('adversarial', () => {
    type Stmt = { statement: { dueCents: number; openPeriodCents: number } }
    const stmt = async (id: string, user = ANA) => (await (await get(id, user)).json()) as Stmt

    // A purchase at 23:30 UTC, ten days ago, on the day a card closes: it is still that day in
    // Mexico City (UTC-6) but already the next one in Kiritimati (UTC+14).
    const lateUtc = () => {
      const d = daysAgo(10)
      d.setUTCHours(23, 30, 0, 0)
      return d
    }

    it('decides which statement a purchase belongs to by the owner time zone', async () => {
      const KIRI = `${run}-kiri`
      await db.insert(schema.user).values({ id: KIRI, name: 'Kiri', email: `${KIRI}@test.local` })
      await db.insert(schema.userProfile).values({ userId: KIRI, displayName: 'Kiri', timeZone: 'Pacific/Kiritimati' })

      const when = lateUtc()
      const mexico = await card({ cutoffDay: when.getUTCDate() })
      const [kiriCard] = await db
        .insert(schema.financialAccount)
        .values({ userId: KIRI, name: 'k', type: 'credito', cutoffDay: when.getUTCDate(), paymentDay: 28 })
        .returning()
      for (const [uid, accountId] of [[ANA, mexico.id], [KIRI, kiriCard!.id]] as const) {
        await db.insert(schema.expense).values({ ...move(accountId, 'expense', 90_000, when), userId: uid })
      }

      const inMexico = (await stmt(mexico.id)).statement
      expect([inMexico.dueCents, inMexico.openPeriodCents]).toEqual([90_000, 0])
      const inKiri = (await stmt(kiriCard!.id, KIRI)).statement
      expect([inKiri.dueCents, inKiri.openPeriodCents]).toEqual([0, 90_000])
      await db.delete(schema.user).where(eq(schema.user.id, KIRI))
    })

    it('counts a transfer out of the card as a purchase and one into it as a payment', async () => {
      const c = await card()
      const [bank] = await db
        .insert(schema.financialAccount)
        .values({ userId: ANA, name: `bank-${Math.random()}`, type: 'debito' })
        .returning()
      await db.insert(schema.expense).values([
        { ...move(c.id, 'expense', 0, daysAgo(0)), kind: 'transfer', amountCents: 20_000, toAccountId: bank!.id },
        { ...move(bank!.id, 'expense', 0, daysAgo(0)), kind: 'transfer', amountCents: 5_000, toAccountId: c.id },
      ])
      // 20,000 out of the card is spending; 5,000 into it is a payment, which only reduces what
      // is due, so the open period shows the spending untouched.
      expect((await stmt(c.id)).statement.openPeriodCents).toBe(20_000)
    })

    it('ignores movements on other accounts and forgets a deleted purchase', async () => {
      const c = await card()
      const other = await card()
      const [kept] = await db.insert(schema.expense).values(move(other.id, 'expense', 1_000, daysAgo(0))).returning()
      await db.insert(schema.expense).values(move(c.id, 'expense', 3_000, daysAgo(0)))
      const [gone] = await db.insert(schema.expense).values(move(c.id, 'expense', 7_000, daysAgo(0))).returning()
      expect((await stmt(c.id)).statement.openPeriodCents).toBe(10_000)
      await db.delete(schema.expense).where(eq(schema.expense.id, gone!.id))
      expect((await stmt(c.id)).statement.openPeriodCents).toBe(3_000)
      expect(kept).toBeTruthy()
    })

    it.each(['not-a-uuid', '00000000-0000-0000-0000-000000000000', "1'; drop table expense;--"])(
      'answers %s without leaking or crashing',
      async (id) => {
        const res = await app.request(`/accounts/${encodeURIComponent(id)}/statement`, { headers: { 'x-test-user': ANA } })
        expect([400, 404]).toContain(res.status)
      },
    )
  })
})
