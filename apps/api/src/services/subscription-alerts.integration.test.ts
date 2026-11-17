import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { Hono } from 'hono'

/**
 * Subscription alerts on a real, migrated Postgres (opt-in: TEST_DATABASE_URL). One file on
 * purpose: the service scans every subscription, so two files would see each other's rows.
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

const sendPushToUser = vi.fn()
vi.mock('./push-sender', () => ({ sendPushToUser: (...args: unknown[]) => sendPushToUser(...args) }))

describe.skipIf(!TEST_DATABASE_URL)('subscription alerts, hostile scenarios (Postgres)', async () => {
  const { db, schema } = await import('../db/client')
  const { runSubscriptionAlerts } = await import('./subscription-alerts')
  const { subscriptionsRoute } = await import('../routes/subscriptions')
  const { inArray } = await import('drizzle-orm')

  const run = `sx${Date.now()}`
  const ANA = `${run}-ana`
  const BEN = `${run}-ben`
  // 22:00 on Nov 19 in Mexico City (UTC-6).
  const NOW = new Date('2026-11-20T04:00:00Z')
  const app = new Hono().route('/subscriptions', subscriptionsRoute)

  const make = async (userId: string, extra: Partial<typeof schema.subscription.$inferInsert> = {}) =>
    (
      await db
        .insert(schema.subscription)
        .values({ userId, name: `Sub ${userId}`, category: 'x', amountCents: 10_000, nextChargeAt: '2026-11-20', ...extra })
        .returning()
    )[0]!

  beforeEach(async () => {
    sendPushToUser.mockClear()
    await db.delete(schema.user).where(inArray(schema.user.id, [ANA, BEN]))
    await db.insert(schema.user).values([
      { id: ANA, name: 'Ana', email: `${ANA}@test.local` },
      { id: BEN, name: 'Ben', email: `${BEN}@test.local` },
    ])
  })

  afterAll(async () => {
    await db.delete(schema.user).where(inArray(schema.user.id, [ANA, BEN]))
  })

  it('alerts the day before a charge, once', async () => {
    const sub = await make(ANA)
    expect((await runSubscriptionAlerts(NOW)).sent).toBe(1)
    expect(sendPushToUser).toHaveBeenCalledWith(ANA, expect.objectContaining({ title: expect.stringContaining('Mañana') }))
    const after = await db.query.subscription.findFirst({ where: (s, { eq }) => eq(s.id, sub.id) })
    expect(after!.lastAlertedFor).toBe('2026-11-20')
    expect((await runSubscriptionAlerts(NOW)).sent).toBe(0)
  })

  it('moves a charge that already passed to its next date without alerting', async () => {
    const sub = await make(ANA, { nextChargeAt: '2026-10-20' })
    expect((await runSubscriptionAlerts(NOW)).sent).toBe(0)
    const after = await db.query.subscription.findFirst({ where: (s, { eq }) => eq(s.id, sub.id) })
    expect(after!.nextChargeAt).toBe('2026-11-20')
  })

  it('leaves cancelled subscriptions alone', async () => {
    const sub = await make(ANA, { cancelledAt: new Date() })
    expect((await runSubscriptionAlerts(NOW)).sent).toBe(0)
    const after = await db.query.subscription.findFirst({ where: (s, { eq }) => eq(s.id, sub.id) })
    expect(after!.lastAlertedFor).toBeNull()
  })

  it('sends once when two runs race for the same charge', async () => {
    await make(ANA)
    const [a, b] = await Promise.all([runSubscriptionAlerts(NOW), runSubscriptionAlerts(NOW)])
    expect(a.sent + b.sent).toBe(1)
    expect(sendPushToUser).toHaveBeenCalledTimes(1)
  })

  it('sends each alert to its owner only', async () => {
    await make(ANA)
    await make(BEN, { nextChargeAt: '2026-11-25' }) // not due yet
    await runSubscriptionAlerts(NOW)
    expect(sendPushToUser).toHaveBeenCalledTimes(1)
    expect(sendPushToUser.mock.calls[0]![0]).toBe(ANA)
  })

  it('warns again when the charge date is edited to an earlier date than the one already alerted', async () => {
    const sub = await make(ANA, { nextChargeAt: '2026-12-20', lastAlertedFor: '2026-12-20' })
    const res = await app.request(`/subscriptions/${sub.id}`, {
      method: 'PATCH',
      headers: { 'x-test-user': ANA, 'Content-Type': 'application/json' },
      body: JSON.stringify({ nextChargeAt: '2026-11-20' }),
    })
    expect(res.status).toBe(200)
    expect((await runSubscriptionAlerts(NOW)).sent).toBe(1)
  })

  it('a patch that does not touch the date keeps the alert recorded', async () => {
    const sub = await make(ANA, { lastAlertedFor: '2026-11-20' })
    await app.request(`/subscriptions/${sub.id}`, {
      method: 'PATCH',
      headers: { 'x-test-user': ANA, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Renombrada' }),
    })
    expect((await runSubscriptionAlerts(NOW)).sent).toBe(0)
  })

  it('keeps going when one push fails', async () => {
    await make(ANA)
    await make(BEN)
    sendPushToUser.mockRejectedValueOnce(new Error('push exploded'))
    const { sent } = await runSubscriptionAlerts(NOW)
    expect(sendPushToUser).toHaveBeenCalledTimes(2)
    expect(sent).toBe(1)
  })

  it('rolls a months-old charge date forward on its original day, clamped to the month', async () => {
    const sub = await make(ANA, { nextChargeAt: '2025-01-31' })
    expect((await runSubscriptionAlerts(NOW)).sent).toBe(0)
    const after = await db.query.subscription.findFirst({ where: (s, { eq }) => eq(s.id, sub.id) })
    expect(after!.nextChargeAt).toBe('2026-11-30')
  })
})
