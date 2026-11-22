import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { Hono } from 'hono'

/**
 * /incomes and /calendar on a real, migrated Postgres (opt-in like the other integration tests):
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

describe.skipIf(!TEST_DATABASE_URL)('incomes and calendar (Postgres)', async () => {
  const { db, schema } = await import('../db/client')
  const { incomesRoute } = await import('./incomes')
  const { calendarRoute } = await import('./calendar')
  const { createCaller, testUserIds, seedUsers, dropUsers } = await import('../test/integration')

  const app = new Hono().route('/incomes', incomesRoute).route('/calendar', calendarRoute)
  const call = createCaller(app)
  const [ANA, BEN] = testUserIds('cal', ['ana', 'ben'])
  const users = [ANA!, BEN!]

  beforeAll(() => seedUsers(db, schema, users))
  afterAll(() => dropUsers(db, schema, users))

  it('creates, edits and deletes an income; the amount can be cleared and omitted', async () => {
    const created = await call(ANA!, 'POST', '/incomes', { name: 'Nómina', frequency: 'semimonthly', startsOn: '2026-11-15', amountCents: 1_200_000 })
    expect(created.status).toBe(201)
    const id = created.body.income.id as string

    const noAmount = await call(ANA!, 'POST', '/incomes', { name: 'Cobro', frequency: 'once', startsOn: '2026-11-20' })
    expect(noAmount.body.income.amountCents).toBeNull()

    // A PATCH leaves unsent fields alone, and null clears the amount.
    const renamed = await call(ANA!, 'PATCH', `/incomes/${id}`, { name: 'Sueldo' })
    expect(renamed.body.income).toMatchObject({ name: 'Sueldo', frequency: 'semimonthly', amountCents: 1_200_000 })
    const cleared = await call(ANA!, 'PATCH', `/incomes/${id}`, { amountCents: null })
    expect(cleared.body.income.amountCents).toBeNull()
    expect(cleared.body.income.name).toBe('Sueldo')

    expect((await call(ANA!, 'GET', '/incomes')).body.incomes).toHaveLength(2)
    expect((await call(ANA!, 'DELETE', `/incomes/${id}`)).status).toBe(200)
    expect((await call(ANA!, 'GET', '/incomes')).body.incomes).toHaveLength(1)
  })

  it("never lets someone else read, edit or delete an income", async () => {
    const { body } = await call(BEN!, 'POST', '/incomes', { name: 'Mío', frequency: 'once', startsOn: '2026-11-20' })
    const id = body.income.id as string
    expect((await call(ANA!, 'PATCH', `/incomes/${id}`, { name: 'Robado' })).status).toBe(404)
    expect((await call(ANA!, 'DELETE', `/incomes/${id}`)).status).toBe(404)
    expect((await call(ANA!, 'GET', '/incomes')).body.incomes.map((i: { id: string }) => i.id)).not.toContain(id)
    expect((await call(BEN!, 'GET', '/incomes')).body.incomes[0].name).toBe('Mío')
  })

  it('rejects a bad income with a Spanish message', async () => {
    const res = await call(ANA!, 'POST', '/incomes', { name: ' ', frequency: 'once', startsOn: '2026-11-20' })
    expect(res.status).toBe(400)
  })

  it('lists card payments, subscription charges and income for the user only', async () => {
    const [CAL] = testUserIds('calx', ['cal'])
    await seedUsers(db, schema, [CAL!])
    try {
      await db.insert(schema.financialAccount).values([
        { userId: CAL!, name: 'Visa', type: 'credito', cutoffDay: 15, paymentDay: 5 },
        { userId: CAL!, name: 'Sin días', type: 'credito' },
        { userId: CAL!, name: 'Débito', type: 'debito', cutoffDay: 1, paymentDay: 2 },
      ])
      await db.insert(schema.subscription).values([
        { userId: CAL!, name: 'Netflix', category: 'streaming', amountCents: 19_900, nextChargeAt: '2026-11-10' },
        { userId: CAL!, name: 'Vieja', category: 'streaming', amountCents: 5_000, nextChargeAt: '2026-11-12', cancelledAt: new Date() },
      ])
      await call(CAL!, 'POST', '/incomes', { name: 'Nómina', frequency: 'monthly', startsOn: '2026-11-30', amountCents: 900_000 })

      const res = await call(CAL!, 'GET', '/calendar?from=2026-11-01&to=2026-11-30')
      expect(res.status).toBe(200)
      expect(res.body.today).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(res.body.events).toEqual([
        { date: '2026-11-05', kind: 'card_payment', title: 'Visa', amountCents: null, sourceId: expect.any(String) },
        { date: '2026-11-10', kind: 'subscription', title: 'Netflix', amountCents: 19_900, sourceId: expect.any(String) },
        { date: '2026-11-30', kind: 'income', title: 'Nómina', amountCents: 900_000, sourceId: expect.any(String) },
      ])
      // Someone else's calendar is empty of all that.
      expect((await call(BEN!, 'GET', '/calendar?from=2026-11-01&to=2026-11-30')).body.events.map((e: { title: string }) => e.title)).toEqual(['Mío'])
    } finally {
      await dropUsers(db, schema, [CAL!])
    }
  })

  it('rejects a missing, backwards or oversized range', async () => {
    expect((await call(ANA!, 'GET', '/calendar')).status).toBe(400)
    expect((await call(ANA!, 'GET', '/calendar?from=2026-11-30&to=2026-11-01')).status).toBe(400)
    expect((await call(ANA!, 'GET', '/calendar?from=2026-01-01&to=2028-01-01')).status).toBe(400)
  })
})
