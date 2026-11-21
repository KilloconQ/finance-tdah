import { and, eq, isNull } from 'drizzle-orm'
import { DEFAULT_TIME_ZONE, localClock, nextChargeOnOrAfter } from '@finance-tdah/shared/domain'
import { db, schema } from '../db/client'

/**
 * Moves each charge date that has passed to its next one, so the next charge shown is always ahead.
 * (The notifications themselves are in `calendar-alerts`.) Safe to run often and from more than one process:
 * the update is conditional on the old date, so a second process or the pause route that already moved it wins.
 */
export async function rollSubscriptionDates(now: Date = new Date()): Promise<{ rolled: number }> {
  const rows = await db
    .select({ sub: schema.subscription, timeZone: schema.userProfile.timeZone })
    .from(schema.subscription)
    .leftJoin(schema.userProfile, eq(schema.userProfile.userId, schema.subscription.userId))
    .where(isNull(schema.subscription.cancelledAt))

  let rolled = 0
  for (const { sub, timeZone } of rows) {
    const today = localClock(now, timeZone ?? DEFAULT_TIME_ZONE).date
    const next = nextChargeOnOrAfter(sub.nextChargeAt, sub.cadence, today)
    if (next === sub.nextChargeAt) continue
    const moved = await db
      .update(schema.subscription)
      .set({ nextChargeAt: next, updatedAt: now })
      .where(and(eq(schema.subscription.id, sub.id), eq(schema.subscription.nextChargeAt, sub.nextChargeAt)))
      .returning({ id: schema.subscription.id })
    rolled += moved.length
  }
  return { rolled }
}
