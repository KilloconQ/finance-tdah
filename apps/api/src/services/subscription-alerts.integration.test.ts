import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Rolling subscription charge dates on a real, migrated Postgres (opt-in: TEST_DATABASE_URL). One file on
 * purpose: the service scans every subscription, so two files would see each other's rows.
 */
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL

vi.mock('../env', () => ({
  env: { DATABASE_URL: process.env.TEST_DATABASE_URL ?? 'postgres://unused', NODE_ENV: 'test' },
  features: { passwordResetEmail: false, webPush: false },
}))

describe.skipIf(!TEST_DATABASE_URL)('subscription date roll (Postgres)', async () => {
  const { db, schema } = await import('../db/client')
  const { rollSubscriptionDates } = await import('./subscription-alerts')
  const { inArray } = await import('drizzle-orm')

  const run = `sx${Date.now()}`
  const ANA = `${run}-ana`
  const BEN = `${run}-ben`
  // 22:00 on Nov 19 in Mexico City (UTC-6).
  const NOW = new Date('2026-11-20T04:00:00Z')

  const make = async (userId: string, extra: Partial<typeof schema.subscription.$inferInsert> = {}) =>
    (
      await db
        .insert(schema.subscription)
        .values({ userId, name: `Sub ${userId}`, category: 'x', amountCents: 10_000, nextChargeAt: '2026-11-20', ...extra })
        .returning()
    )[0]!

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

  it('moves a charge that already passed to its next date', async () => {
    const sub = await make(ANA, { nextChargeAt: '2026-10-20' })
    expect((await rollSubscriptionDates(NOW)).rolled).toBeGreaterThanOrEqual(1)
    const after = await db.query.subscription.findFirst({ where: (s, { eq }) => eq(s.id, sub.id) })
    expect(after!.nextChargeAt).toBe('2026-11-20')
  })

  it('leaves a charge that is today or ahead where it is', async () => {
    const today = await make(ANA, { nextChargeAt: '2026-11-19' })
    const ahead = await make(BEN, { nextChargeAt: '2026-11-25' })
    await rollSubscriptionDates(NOW)
    expect((await db.query.subscription.findFirst({ where: (s, { eq }) => eq(s.id, today.id) }))!.nextChargeAt).toBe('2026-11-19')
    expect((await db.query.subscription.findFirst({ where: (s, { eq }) => eq(s.id, ahead.id) }))!.nextChargeAt).toBe('2026-11-25')
  })

  it('leaves cancelled subscriptions alone', async () => {
    const sub = await make(ANA, { cancelledAt: new Date(), nextChargeAt: '2026-10-20' })
    await rollSubscriptionDates(NOW)
    const after = await db.query.subscription.findFirst({ where: (s, { eq }) => eq(s.id, sub.id) })
    expect(after!.nextChargeAt).toBe('2026-10-20')
  })

  it('rolls a months-old charge date forward on its original day, clamped to the month', async () => {
    const sub = await make(ANA, { nextChargeAt: '2025-01-31' })
    await rollSubscriptionDates(NOW)
    const after = await db.query.subscription.findFirst({ where: (s, { eq }) => eq(s.id, sub.id) })
    expect(after!.nextChargeAt).toBe('2026-11-30')
  })
})
