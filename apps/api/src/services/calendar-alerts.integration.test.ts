import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { Hono } from 'hono'

/**
 * Calendar notifications and their options on a real, migrated Postgres (opt-in: TEST_DATABASE_URL). Other test files
 * share the database, so every assertion looks only at the pushes sent to this file's own users.
 */
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL

vi.mock('../env', () => ({
  env: { DATABASE_URL: process.env.TEST_DATABASE_URL ?? 'postgres://unused', NODE_ENV: 'test' },
  features: { passwordResetEmail: false, webPush: true, apns: false },
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

const sendPushToUser = vi.fn()
vi.mock('./push-sender', () => ({ sendPushToUser: (...args: unknown[]) => sendPushToUser(...args) }))

describe.skipIf(!TEST_DATABASE_URL)('calendar notifications (Postgres)', async () => {
  const { db, schema } = await import('../db/client')
  const { runCalendarAlerts } = await import('./calendar-alerts')
  const { notificationRulesRoute } = await import('../routes/notification-rules')
  const { inArray } = await import('drizzle-orm')

  const run = `ca${Date.now()}`
  const ANA = `${run}-ana`
  const BEN = `${run}-ben`
  const MINE = [ANA, BEN]
  // 19:00 on Nov 19 in Mexico City (UTC-6).
  const AT_19 = new Date('2026-11-20T01:00:00Z')
  const AT_18 = new Date('2026-11-20T00:00:00Z')
  const app = new Hono().route('/notification-rules', notificationRulesRoute)

  const pushesTo = (userId: string) => sendPushToUser.mock.calls.filter((c) => c[0] === userId).map((c) => c[1] as { title: string; body: string })
  const call = (userId: string, path: string, init: RequestInit = {}) =>
    app.request(`/notification-rules${path}`, { ...init, headers: { 'x-test-user': userId, 'Content-Type': 'application/json' } })
  const sub = (userId: string, extra: Partial<typeof schema.subscription.$inferInsert> = {}) =>
    db.insert(schema.subscription).values({ userId, name: 'Netflix', category: 'x', amountCents: 19_900, nextChargeAt: '2026-11-20', ...extra })
  const income = (userId: string, startsOn: string) =>
    db.insert(schema.scheduledIncome).values({ userId, name: 'Nómina', amountCents: 1_200_000, frequency: 'once', startsOn })

  beforeEach(async () => {
    sendPushToUser.mockReset()
    await db.delete(schema.user).where(inArray(schema.user.id, MINE))
    await db.insert(schema.user).values(MINE.map((id) => ({ id, name: id, email: `${id}@test.local` })))
    await db.insert(schema.userProfile).values(MINE.map((id) => ({ userId: id, displayName: id, timeZone: 'America/Mexico_City' })))
    await db.insert(schema.pushSubscription).values(MINE.map((id) => ({ userId: id, endpoint: `https://push.test/${id}`, p256dh: 'p', auth: 'a' })))
  })

  afterAll(async () => {
    await db.delete(schema.user).where(inArray(schema.user.id, MINE))
  })

  it('a subscription is announced the day before, once', async () => {
    await sub(ANA)
    await runCalendarAlerts(AT_19)
    expect(pushesTo(ANA)).toHaveLength(1)
    expect(pushesTo(ANA)[0]!.title).toContain('Mañana se cobra Netflix')
    await runCalendarAlerts(AT_19)
    expect(pushesTo(ANA)).toHaveLength(1)
  })

  it('income goes out on the pay day only from 19:00', async () => {
    await income(ANA, '2026-11-19')
    await runCalendarAlerts(AT_18)
    expect(pushesTo(ANA)).toHaveLength(0)
    await runCalendarAlerts(AT_19)
    expect(pushesTo(ANA)).toHaveLength(1)
    expect(pushesTo(ANA)[0]!.title).toContain('Hoy te toca cobrar Nómina')
  })

  it('a card is announced 4 days before its payment and 2 before its cutoff', async () => {
    // Cutoff Nov 21, paid Nov 23: on Nov 19 the cutoff is 2 days away and the payment 4.
    await db.insert(schema.financialAccount).values({ userId: ANA, name: 'Visa', type: 'credito', balanceCents: 0, cutoffDay: 21, paymentDay: 23 })
    await runCalendarAlerts(AT_19)
    const titles = pushesTo(ANA).map((p) => p.title)
    expect(titles).toHaveLength(2)
    expect(titles.some((t) => t.includes('corta tu tarjeta Visa'))).toBe(true)
    expect(titles.some((t) => t.includes('vence el pago de Visa'))).toBe(true)
  })

  it('a disabled kind sends nothing', async () => {
    await sub(ANA)
    expect((await call(ANA, '/subscription_monthly', { method: 'PUT', body: JSON.stringify({ enabled: false, daysBefore: 1, hour: 9 }) })).status).toBe(200)
    await runCalendarAlerts(AT_19)
    expect(pushesTo(ANA)).toHaveLength(0)
  })

  it('a custom number of days is respected', async () => {
    await sub(ANA, { nextChargeAt: '2026-11-22' })
    await runCalendarAlerts(AT_19)
    expect(pushesTo(ANA)).toHaveLength(0) // 3 days away, the default is 1
    await call(ANA, '/subscription_monthly', { method: 'PUT', body: JSON.stringify({ enabled: true, daysBefore: 3, hour: 9 }) })
    await runCalendarAlerts(AT_19)
    expect(pushesTo(ANA)[0]!.title).toContain('En 3 días')
  })

  it('sends each person only their own, and nothing to someone it cannot reach', async () => {
    await sub(ANA)
    await sub(BEN)
    await db.delete(schema.pushSubscription).where(inArray(schema.pushSubscription.userId, [BEN]))
    await runCalendarAlerts(AT_19)
    expect(pushesTo(ANA)).toHaveLength(1)
    expect(pushesTo(BEN)).toHaveLength(0)
    // Reachable later: the notification was not burned while they had no device.
    await db.insert(schema.pushSubscription).values({ userId: BEN, endpoint: `https://push.test/${BEN}-2`, p256dh: 'p', auth: 'a' })
    await runCalendarAlerts(AT_19)
    expect(pushesTo(BEN)).toHaveLength(1)
  })

  it('sends once when two runs race', async () => {
    await sub(ANA)
    await Promise.all([runCalendarAlerts(AT_19), runCalendarAlerts(AT_19)])
    expect(pushesTo(ANA)).toHaveLength(1)
  })

  it('keeps going when one push fails', async () => {
    await sub(ANA)
    await sub(BEN)
    sendPushToUser.mockRejectedValueOnce(new Error('push exploded'))
    await runCalendarAlerts(AT_19)
    expect(pushesTo(ANA).length + pushesTo(BEN).length).toBe(2)
  })

  it('a charge moved to a new date is announced again for the new date', async () => {
    const [row] = await sub(ANA).returning()
    await runCalendarAlerts(AT_19)
    await db.update(schema.subscription).set({ nextChargeAt: '2026-11-20', name: 'Netflix 2' }).where((await import('drizzle-orm')).eq(schema.subscription.id, row!.id))
    await runCalendarAlerts(AT_19)
    expect(pushesTo(ANA)).toHaveLength(1) // same date: still once
    await db.update(schema.subscription).set({ nextChargeAt: '2026-12-20' }).where((await import('drizzle-orm')).eq(schema.subscription.id, row!.id))
    await runCalendarAlerts(new Date('2026-12-20T01:00:00Z'))
    expect(pushesTo(ANA)).toHaveLength(2)
  })

  describe('options', () => {
    it('start as the defaults that were asked for', async () => {
      const { rules } = (await (await call(ANA, '')).json()) as { rules: { kind: string; enabled: boolean; daysBefore: number; hour: number }[] }
      expect(rules.map((r) => [r.kind, r.daysBefore])).toEqual([
        ['income', 0],
        ['card_cutoff', 2],
        ['card_payment', 4],
        ['subscription_monthly', 1],
        ['subscription_yearly', 7],
      ])
      expect(rules.find((r) => r.kind === 'income')!.hour).toBe(19)
    })

    it('are saved per person', async () => {
      await call(ANA, '/income', { method: 'PUT', body: JSON.stringify({ enabled: true, daysBefore: 2, hour: 8 }) })
      const ana = (await (await call(ANA, '')).json()) as { rules: { kind: string; daysBefore: number; hour: number }[] }
      const ben = (await (await call(BEN, '')).json()) as { rules: { kind: string; daysBefore: number; hour: number }[] }
      expect(ana.rules.find((r) => r.kind === 'income')).toMatchObject({ daysBefore: 2, hour: 8 })
      expect(ben.rules.find((r) => r.kind === 'income')).toMatchObject({ daysBefore: 0, hour: 19 })
    })

    it('reject nonsense', async () => {
      for (const body of [{ enabled: true, daysBefore: 31, hour: 9 }, { enabled: true, daysBefore: 1, hour: 24 }, { enabled: true, daysBefore: -1, hour: 9 }, { daysBefore: 1, hour: 9 }]) {
        expect((await call(ANA, '/income', { method: 'PUT', body: JSON.stringify(body) })).status).toBe(400)
      }
      expect((await call(ANA, '/bogus', { method: 'PUT', body: JSON.stringify({ enabled: true, daysBefore: 1, hour: 9 }) })).status).toBe(400)
    })
  })
})
