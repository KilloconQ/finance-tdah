import { calendarEvents, type CalendarInput } from './calendar'
import { dayOf } from './card-statement'

export type AlertKind = 'income' | 'card_cutoff' | 'card_payment' | 'subscription_monthly' | 'subscription_yearly'

export interface AlertRule {
  kind: AlertKind
  enabled: boolean
  /** Days before the event the notification goes out; 0 is the day itself. */
  daysBefore: number
  /** Local hour (0-23) it goes out from on that day. */
  hour: number
}

export const ALERT_KINDS: AlertKind[] = ['income', 'card_cutoff', 'card_payment', 'subscription_monthly', 'subscription_yearly']

export const DEFAULT_ALERT_RULES: Record<AlertKind, Omit<AlertRule, 'kind'>> = {
  income: { enabled: true, daysBefore: 0, hour: 19 },
  card_cutoff: { enabled: true, daysBefore: 2, hour: 9 },
  card_payment: { enabled: true, daysBefore: 4, hour: 9 },
  subscription_monthly: { enabled: true, daysBefore: 1, hour: 9 },
  subscription_yearly: { enabled: true, daysBefore: 7, hour: 9 },
}

/** One rule per kind, in a fixed order: the stored ones, defaults for the rest. */
export function resolveAlertRules(stored: AlertRule[]): AlertRule[] {
  return ALERT_KINDS.map((kind) => stored.find((r) => r.kind === kind) ?? { kind, ...DEFAULT_ALERT_RULES[kind] })
}

export interface DueAlert {
  kind: AlertKind
  sourceId: string
  title: string
  amountCents: number | null
  eventDate: string
  /** Whole days from today to the event. */
  daysAway: number
}

export interface AlertInput extends Omit<CalendarInput, 'from' | 'to'> {
  /** Local date and hour at the user's place. */
  today: string
  hour: number
  rules: AlertRule[]
}

const DAY_MS = 86_400_000
const epochDay = (date: string) => Date.parse(`${date}T00:00:00Z`) / DAY_MS
const addDays = (date: string, n: number) => new Date((epochDay(date) + n) * DAY_MS).toISOString().slice(0, 10)

/** The cutoff dates of a card inside the range. */
function cutoffDates(cutoffDay: number, from: string, to: string): string[] {
  const out: string[] = []
  const first = Number(from.slice(0, 4)) * 12 + Number(from.slice(5, 7)) - 1
  const last = Number(to.slice(0, 4)) * 12 + Number(to.slice(5, 7)) - 1
  for (let i = first; i <= last; i++) {
    const date = dayOf(Math.floor(i / 12), (i % 12) + 1, cutoffDay)
    if (date >= from && date <= to) out.push(date)
  }
  return out
}

/**
 * Every notification that has come due and was not yet past: for each enabled rule, the events from today up to
 * `daysBefore` days ahead whose alert day has arrived (on that day only once the rule's hour is reached).
 * The caller remembers what it already sent, so a run never needs to know about the earlier ones.
 */
export function dueAlerts(input: AlertInput): DueAlert[] {
  const out: DueAlert[] = []
  const cadenceOf = new Map(input.subscriptions.map((s) => [s.id, s.cadence]))

  for (const rule of input.rules) {
    if (!rule.enabled) continue
    const from = input.today
    const to = addDays(from, rule.daysBefore)
    const wanted = (eventDate: string) => {
      const alertDay = addDays(eventDate, -rule.daysBefore)
      return alertDay < input.today || (alertDay === input.today && input.hour >= rule.hour)
    }
    const alert = (e: { sourceId: string; title: string; amountCents: number | null; date: string }): DueAlert => ({
      kind: rule.kind,
      sourceId: e.sourceId,
      title: e.title,
      amountCents: e.amountCents,
      eventDate: e.date,
      daysAway: epochDay(e.date) - epochDay(input.today),
    })

    if (rule.kind === 'card_cutoff') {
      for (const card of input.cards) {
        if (card.cutoffDay == null) continue
        for (const date of cutoffDates(card.cutoffDay, from, to)) {
          if (wanted(date)) out.push(alert({ sourceId: card.id, title: card.name, amountCents: null, date }))
        }
      }
      continue
    }

    const events = calendarEvents({ ...input, from, to })
    for (const e of events) {
      const kind =
        e.kind === 'subscription' ? (cadenceOf.get(e.sourceId) === 'yearly' ? 'subscription_yearly' : 'subscription_monthly') : e.kind
      if (kind === rule.kind && wanted(e.date)) out.push(alert(e))
    }
  }
  return out
}
