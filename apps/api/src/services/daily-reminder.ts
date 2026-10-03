import { and, eq, exists, isNull, lt, or, sql } from 'drizzle-orm'
import { dailyReminderDue, localClock } from '@finance-tdah/shared/domain'
import { db, schema } from '../db/client'
import { logger } from '../lib/logger'
import { sendPushToUser } from './push-sender'

const CHECK_EVERY_MS = 5 * 60 * 1000

const MESSAGES = [
  { title: 'Hey, ¿gastaste algo hoy? 👀', body: 'Anótalo ahora, son 10 segundos.' },
  { title: '¿Hoy no gastaste nada? 🤔', body: 'Si se te pasó algo, anótalo antes de que se te olvide.' },
  { title: 'Checa tu día 📝', body: 'Hoy no has anotado nada. ¿Café, súper, Uber?' },
]

/**
 * Sends "¿gastaste algo hoy?" to everyone whose reminder hour has come and
 * who hasn't logged anything today, at most once per local day. Safe to run
 * as often as you like and from more than one process: each user's day is
 * claimed with a conditional update before anything is sent.
 */
export async function runDailyReminders(now: Date = new Date()): Promise<{ sent: number }> {
  const candidates = await db
    .select({
      userId: schema.userProfile.userId,
      hour: schema.userProfile.dailyReminderHour,
      timeZone: schema.userProfile.timeZone,
      lastOn: schema.userProfile.lastDailyReminderOn,
    })
    .from(schema.userProfile)
    .where(
      and(
        eq(schema.userProfile.dailyReminderEnabled, true),
        exists(
          db
            .select({ one: sql`1` })
            .from(schema.pushSubscription)
            .where(eq(schema.pushSubscription.userId, schema.userProfile.userId)),
        ),
      ),
    )

  let sent = 0
  for (const c of candidates) {
    const clock = localClock(now, c.timeZone)
    if (!dailyReminderDue(clock, c.hour, c.lastOn)) continue

    // Claim today first: a second run (or process) that gets here too finds
    // the row already updated and sends nothing.
    const [claimed] = await db
      .update(schema.userProfile)
      .set({ lastDailyReminderOn: clock.date })
      .where(
        and(
          eq(schema.userProfile.userId, c.userId),
          or(isNull(schema.userProfile.lastDailyReminderOn), lt(schema.userProfile.lastDailyReminderOn, clock.date)),
        ),
      )
      .returning({ userId: schema.userProfile.userId })
    if (!claimed) continue

    // Anything entered today (expense, income or transfer) counts: the point
    // is a nudge on days the app wasn't used at all.
    const [logged] = await db
      .select({ one: sql`1` })
      .from(schema.expense)
      .where(
        and(
          eq(schema.expense.userId, c.userId),
          sql`(${schema.expense.createdAt} at time zone ${c.timeZone})::date = ${clock.date}::date`,
        ),
      )
      .limit(1)
    if (logged) continue

    const message = MESSAGES[Number(clock.date.slice(-2)) % MESSAGES.length]!
    await sendPushToUser(c.userId, { ...message, url: '/add-expense' })
    sent++
  }
  return { sent }
}

export function startDailyReminders(): void {
  const tick = () =>
    runDailyReminders()
      .then(({ sent }) => {
        if (sent > 0) logger.info('daily_reminders_sent', { sent })
      })
      .catch((err) =>
        logger.error('daily_reminders_failed', { message: err instanceof Error ? err.message : String(err) }),
      )
  // `bun --hot` re-runs this module on every save: replace the timer, don't stack them.
  const g = globalThis as { __dailyReminderTimer?: ReturnType<typeof setInterval> }
  clearInterval(g.__dailyReminderTimer)
  void tick()
  g.__dailyReminderTimer = setInterval(tick, CHECK_EVERY_MS)
}
