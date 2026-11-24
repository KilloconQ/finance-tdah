import { and, eq, inArray, isNull } from 'drizzle-orm'
import { DEFAULT_TIME_ZONE, dueAlerts, localClock, resolveAlertRules, type DueAlert } from '@finance-tdah/shared/domain'
import { db, schema } from '../db/client'
import { features } from '../env'
import { logger } from '../lib/logger'
import { money } from '../lib/money'
import { sendPushToUser, type PushPayload } from './push-sender'

const when = (days: number) => (days === 0 ? 'Hoy' : days === 1 ? 'Mañana' : `En ${days} días`)
const amount = (a: DueAlert) => (a.amountCents == null ? '' : ` ${money(a.amountCents)}`)

export function alertMessage(a: DueAlert): PushPayload {
  switch (a.kind) {
    case 'income':
      return {
        title: `${when(a.daysAway)} te toca cobrar ${a.title} 💰`,
        body: `${amount(a).trim() || 'Tu pago'} llega ${a.daysAway === 0 ? 'hoy' : when(a.daysAway).toLowerCase()}. Anótalo en tus movimientos cuando lo recibas.`,
        url: '/calendar',
      }
    case 'card_cutoff':
      return {
        title: `${when(a.daysAway)} corta tu tarjeta ${a.title} ✂️`,
        body: 'Lo que gastes después del corte entra al siguiente periodo.',
        url: '/calendar',
      }
    case 'card_payment':
      return {
        title: `${when(a.daysAway)} vence el pago de ${a.title} 💳`,
        body: 'Paga a tiempo para evitar intereses y recargos.',
        url: '/calendar',
      }
    case 'subscription_monthly':
    case 'subscription_yearly':
      return {
        title: `${when(a.daysAway)} se cobra ${a.title} 💸`,
        body: `Te van a cobrar${amount(a)}. Si ya no la quieres, cancélala antes.`,
        url: '/calendar',
      }
  }
}

/**
 * Sends each calendar notification that has come due, once per event ever. Safe to run often and from more than one
 * process: an event is claimed with an insert on its unique key before anything is sent. Only people the server can
 * reach are considered, otherwise an event would be claimed for a notification that goes nowhere and be lost.
 */
export async function runCalendarAlerts(now: Date = new Date()): Promise<{ sent: number }> {
  const reachable = new Set<string>()
  if (features.webPush) {
    for (const r of await db.selectDistinct({ userId: schema.pushSubscription.userId }).from(schema.pushSubscription)) reachable.add(r.userId)
  }
  if (features.apns) {
    for (const r of await db.selectDistinct({ userId: schema.deviceToken.userId }).from(schema.deviceToken)) reachable.add(r.userId)
  }
  if (reachable.size === 0) return { sent: 0 }
  const ids = [...reachable]

  const [profiles, rules, accounts, subscriptions, incomes] = await Promise.all([
    db.select({ userId: schema.userProfile.userId, timeZone: schema.userProfile.timeZone }).from(schema.userProfile).where(inArray(schema.userProfile.userId, ids)),
    db.select().from(schema.notificationRule).where(inArray(schema.notificationRule.userId, ids)),
    db.select().from(schema.financialAccount).where(and(inArray(schema.financialAccount.userId, ids), eq(schema.financialAccount.type, 'credito'), isNull(schema.financialAccount.closedAt))),
    db.select().from(schema.subscription).where(and(inArray(schema.subscription.userId, ids), isNull(schema.subscription.cancelledAt))),
    db.select().from(schema.scheduledIncome).where(inArray(schema.scheduledIncome.userId, ids)),
  ])
  const of = <T extends { userId: string }>(rows: T[], id: string) => rows.filter((r) => r.userId === id)

  let sent = 0
  for (const profile of profiles) {
    const clock = localClock(now, profile.timeZone ?? DEFAULT_TIME_ZONE)
    const alerts = dueAlerts({
      today: clock.date,
      hour: clock.hour,
      rules: resolveAlertRules(of(rules, profile.userId)),
      cards: of(accounts, profile.userId).map((a) => ({ id: a.id, name: a.name, cutoffDay: a.cutoffDay, paymentDay: a.paymentDay })),
      subscriptions: of(subscriptions, profile.userId).map((s) => ({
        id: s.id,
        name: s.name,
        amountCents: s.amountCents,
        cadence: s.cadence,
        nextChargeAt: s.nextChargeAt,
      })),
      incomes: of(incomes, profile.userId).map((i) => ({
        id: i.id,
        name: i.name,
        amountCents: i.amountCents,
        frequency: i.frequency,
        startsOn: i.startsOn,
      })),
    })

    for (const alert of alerts) {
      const [claimed] = await db
        .insert(schema.calendarAlert)
        .values({ userId: profile.userId, kind: alert.kind, sourceId: alert.sourceId, eventDate: alert.eventDate })
        .onConflictDoNothing()
        .returning({ kind: schema.calendarAlert.kind })
      if (!claimed) continue
      // One failed push must not stop everyone else's notifications.
      try {
        await sendPushToUser(profile.userId, alertMessage(alert))
        sent++
      } catch (err) {
        logger.error('calendar_alert_failed', { message: err instanceof Error ? err.message : String(err) })
      }
    }
  }
  return { sent }
}
