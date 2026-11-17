import { and, eq, isNull, lt, or } from 'drizzle-orm'
import { chargeAlertDue, DEFAULT_TIME_ZONE, localClock, nextChargeOnOrAfter } from '@finance-tdah/shared/domain'
import { db, schema } from '../db/client'
import { logger } from '../lib/logger'
import { money } from '../lib/money'
import { sendPushToUser } from './push-sender'

/**
 * Heads-up push the day before a subscription charges (or on the day, if the day before was
 * missed), and rolls each charge date forward once it has passed. Safe to run often and from
 * more than one process: each charge is claimed with a conditional update before it is sent.
 */
export async function runSubscriptionAlerts(now: Date = new Date()): Promise<{ sent: number }> {
  const rows = await db
    .select({
      sub: schema.subscription,
      timeZone: schema.userProfile.timeZone,
      reminderHour: schema.userProfile.dailyReminderHour,
    })
    .from(schema.subscription)
    .leftJoin(schema.userProfile, eq(schema.userProfile.userId, schema.subscription.userId))
    .where(isNull(schema.subscription.cancelledAt))

  let sent = 0
  for (const { sub, timeZone, reminderHour } of rows) {
    const clock = localClock(now, timeZone ?? DEFAULT_TIME_ZONE)

    const due = chargeAlertDue({
      nextChargeAt: sub.nextChargeAt,
      today: clock.date,
      hour: clock.hour,
      reminderHour: reminderHour ?? 21,
      lastAlertedFor: sub.lastAlertedFor,
    })
    if (due) {
      const [claimed] = await db
        .update(schema.subscription)
        .set({ lastAlertedFor: sub.nextChargeAt })
        .where(
          and(
            eq(schema.subscription.id, sub.id),
            eq(schema.subscription.nextChargeAt, sub.nextChargeAt),
            or(isNull(schema.subscription.lastAlertedFor), lt(schema.subscription.lastAlertedFor, sub.nextChargeAt)),
          ),
        )
        .returning({ id: schema.subscription.id })
      if (claimed) {
        const when = sub.nextChargeAt === clock.date ? 'Hoy' : 'Mañana'
        // One failed push must not stop everyone else's alerts or the date roll below.
        try {
          await sendPushToUser(sub.userId, {
            title: `${when} se cobra ${sub.name} 💸`,
            body: `Te van a cobrar ${money(sub.amountCents)}.`,
            url: `/subscriptions/${sub.id}`,
          })
          sent++
        } catch (err) {
          logger.error('subscription_alert_failed', { message: err instanceof Error ? err.message : String(err) })
        }
      }
    }

    // A charge that has passed moves to its next date. Conditional on the old date so a second
    // process (or the pause route) that already moved it is left alone.
    const next = nextChargeOnOrAfter(sub.nextChargeAt, sub.cadence, clock.date)
    if (next !== sub.nextChargeAt) {
      await db
        .update(schema.subscription)
        .set({ nextChargeAt: next, updatedAt: now })
        .where(and(eq(schema.subscription.id, sub.id), eq(schema.subscription.nextChargeAt, sub.nextChargeAt)))
    }
  }
  return { sent }
}
