import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Runs the daily reminder against a real, migrated Postgres: time zones,
 * the "logged today" query and the once-a-day claim are SQL. Opt-in like
 * envelopes.integration.test.ts:
 *
 *   TEST_DATABASE_URL=postgres://… pnpm --filter @finance-tdah/api test
 */
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL

vi.mock('../env', () => ({
  env: { DATABASE_URL: process.env.TEST_DATABASE_URL ?? 'postgres://unused', NODE_ENV: 'test' },
  features: { passwordResetEmail: false, webPush: true },
}))

const { sendPushToUser } = vi.hoisted(() => ({ sendPushToUser: vi.fn() }))
vi.mock('./push-sender', () => ({ sendPushToUser }))

describe.skipIf(!TEST_DATABASE_URL)('daily reminder (Postgres)', async () => {
  const { db, schema } = await import('../db/client')
  const { runDailyReminders } = await import('./daily-reminder')
  const { inArray, sql } = await import('drizzle-orm')

  const run = `r${Date.now()}`
  const ANA = `${run}-ana`
  // 21:30 on Oct 2 in Mexico City.
  const NINE_THIRTY_PM = new Date('2026-10-03T03:30:00Z')

  async function user(
    id: string,
    profile: Partial<typeof schema.userProfile.$inferInsert> = {},
    { push = true }: { push?: boolean } = {},
  ) {
    await db.insert(schema.user).values({ id, name: id, email: `${id}@test.local` })
    await db.insert(schema.userProfile).values({ userId: id, displayName: id, ...profile })
    if (push) {
      await db.insert(schema.pushSubscription).values({ userId: id, endpoint: `https://push.test/${id}`, p256dh: 'k', auth: 'a' })
    }
  }

  const remindedUsers = () => sendPushToUser.mock.calls.map(([userId]) => userId as string)
  const created: string[] = []
  const make = async (...args: Parameters<typeof user>) => {
    created.push(args[0])
    await user(...args)
  }

  beforeEach(async () => {
    sendPushToUser.mockReset()
  })

  afterAll(async () => {
    await db.delete(schema.user).where(inArray(schema.user.id, created))
  })

  it("reminds at the user's hour on a day with nothing logged, once", async () => {
    await make(`${ANA}-1`)
    await runDailyReminders(new Date('2026-10-03T02:30:00Z')) // 20:30 local: too early
    expect(remindedUsers()).not.toContain(`${ANA}-1`)

    await runDailyReminders(NINE_THIRTY_PM)
    await runDailyReminders(NINE_THIRTY_PM)
    expect(remindedUsers().filter((u) => u === `${ANA}-1`)).toHaveLength(1)
    expect(sendPushToUser).toHaveBeenCalledWith(`${ANA}-1`, expect.objectContaining({ url: '/add-expense' }))
  })

  it('stays quiet when something was logged today, in local time', async () => {
    await make(`${ANA}-2`)
    // 18:00 local today.
    await db.insert(schema.expense).values({
      userId: `${ANA}-2`,
      amountCents: 5_000,
      category: 'café',
      description: 'café',
      createdAt: new Date('2026-10-03T00:00:00Z'),
    })
    await runDailyReminders(NINE_THIRTY_PM)
    expect(remindedUsers()).not.toContain(`${ANA}-2`)
  })

  it('counts something logged yesterday (local) as not today', async () => {
    await make(`${ANA}-3`)
    // 23:00 local on Oct 1, which is already Oct 2 in UTC.
    await db.insert(schema.expense).values({
      userId: `${ANA}-3`,
      amountCents: 5_000,
      category: 'café',
      description: 'café',
      createdAt: new Date('2026-10-02T05:00:00Z'),
    })
    await runDailyReminders(NINE_THIRTY_PM)
    expect(remindedUsers()).toContain(`${ANA}-3`)
  })

  it('skips users who turned it off, chose a later hour, or have no device subscribed', async () => {
    await make(`${ANA}-4`, { dailyReminderEnabled: false })
    await make(`${ANA}-5`, { dailyReminderHour: 22 })
    await make(`${ANA}-6`, {}, { push: false })
    await runDailyReminders(NINE_THIRTY_PM)
    expect(remindedUsers()).not.toContain(`${ANA}-4`)
    expect(remindedUsers()).not.toContain(`${ANA}-5`)
    expect(remindedUsers()).not.toContain(`${ANA}-6`)
  })

  it("uses each user's own time zone", async () => {
    // 03:30 UTC is 23:30 in New York (UTC-4) but 05:30 in Madrid (UTC+2).
    await make(`${ANA}-7`, { timeZone: 'America/New_York' })
    await make(`${ANA}-8`, { timeZone: 'Europe/Madrid' })
    await runDailyReminders(NINE_THIRTY_PM)
    expect(remindedUsers()).toContain(`${ANA}-7`)
    expect(remindedUsers()).not.toContain(`${ANA}-8`)
  })

  it('sends once even when runs overlap', async () => {
    await make(`${ANA}-10`)
    // Open the pool's connections first, so both runs really read before either claims.
    await Promise.all(Array.from({ length: 6 }, () => db.execute(sql`select pg_sleep(0.05)`)))
    await Promise.all(Array.from({ length: 4 }, () => runDailyReminders(NINE_THIRTY_PM)))
    expect(remindedUsers().filter((u) => u === `${ANA}-10`)).toHaveLength(1)
  })

  it('reminds again the next day', async () => {
    await make(`${ANA}-9`)
    await runDailyReminders(NINE_THIRTY_PM)
    await runDailyReminders(new Date('2026-10-04T03:30:00Z'))
    expect(remindedUsers().filter((u) => u === `${ANA}-9`)).toHaveLength(2)
  })
})
