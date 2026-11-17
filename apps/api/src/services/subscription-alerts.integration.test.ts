import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Subscription charge alerts on a real, migrated Postgres (opt-in like the other integration
 * tests):
 *
 *   TEST_DATABASE_URL=postgres://… pnpm --filter @finance-tdah/api test
 */
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL

vi.mock('../env', () => ({
  env: { DATABASE_URL: process.env.TEST_DATABASE_URL ?? 'postgres://unused', NODE_ENV: 'test' },
  features: { passwordResetEmail: false, webPush: false },
}))

const sendPushToUser = vi.fn()
vi.mock('./push-sender', () => ({ sendPushToUser: (...args: unknown[]) => sendPushToUser(...args) }))

describe.skipIf(!TEST_DATABASE_URL)('subscription charge alerts (Postgres)', async () => {
  const { db, schema } = await import('../db/client')
  const { runSubscriptionAlerts } = await import('./subscription-alerts')
  const { eq } = await import('drizzle-orm')

  const ANA = `sa${Date.now()}-ana`
  // 22:00 on Nov 19 in Mexico City (UTC-6): past the default 21:00 reminder hour.
  const NOW = new Date('2026-11-20T04:00:00Z')

  async function subscription(extra: Partial<typeof schema.subscription.$inferInsert> = {}) {
    const [row] = await db
      .insert(schema.subscription)
      .values({ userId: ANA, name: 'Netflix', category: 'streaming', amountCents: 25_000, nextChargeAt: '2026-11-20', ...extra })
      .returning()
    return row!
  }
  const reload = async (id: string) =>
    (await db.query.subscription.findFirst({ where: (s, { eq }) => eq(s.id, id) }))!

  beforeEach(async () => {
    sendPushToUser.mockClear()
    await db.delete(schema.user).where(eq(schema.user.id, ANA))
    await db.insert(schema.user).values({ id: ANA, name: 'Ana', email: `${ANA}@test.local` })
  })

  afterAll(async () => {
    await db.delete(schema.user).where(eq(schema.user.id, ANA))
  })

  it('alerts the day before a charge, once', async () => {
    const sub = await subscription()
    expect((await runSubscriptionAlerts(NOW)).sent).toBe(1)
    expect(sendPushToUser).toHaveBeenCalledWith(ANA, expect.objectContaining({ title: expect.stringContaining('Mañana') }))
    expect((await reload(sub.id)).lastAlertedFor).toBe('2026-11-20')
    expect((await runSubscriptionAlerts(NOW)).sent).toBe(0)
  })

  it('moves a charge that already passed to its next date without alerting', async () => {
    const sub = await subscription({ nextChargeAt: '2026-10-20' })
    expect((await runSubscriptionAlerts(NOW)).sent).toBe(0)
    expect((await reload(sub.id)).nextChargeAt).toBe('2026-11-20')
  })

  it('leaves cancelled subscriptions alone', async () => {
    const sub = await subscription({ cancelledAt: new Date() })
    expect((await runSubscriptionAlerts(NOW)).sent).toBe(0)
    expect((await reload(sub.id)).lastAlertedFor).toBeNull()
  })
})
