import { dayOf } from './card-statement'
import { addMonthsClamped } from './subscription'
import type { SubscriptionCadence } from '../types'

export type IncomeFrequency = 'once' | 'weekly' | 'biweekly' | 'semimonthly' | 'monthly'
export type CalendarEventKind = 'card_payment' | 'subscription' | 'income'

export interface CalendarEvent {
  date: string
  kind: CalendarEventKind
  title: string
  /** Null when it isn't known: a card's amount due, or an income registered without one. */
  amountCents: number | null
  sourceId: string
}

export interface CalendarInput {
  from: string
  to: string
  cards: { id: string; name: string; cutoffDay: number | null; paymentDay: number | null }[]
  subscriptions: { id: string; name: string; amountCents: number; cadence: SubscriptionCadence; nextChargeAt: string }[]
  incomes: { id: string; name: string; amountCents: number | null; frequency: IncomeFrequency; startsOn: string }[]
}

const DAY_MS = 86_400_000
const KIND_ORDER: Record<CalendarEventKind, number> = { subscription: 0, card_payment: 1, income: 2 }
const epochDay = (date: string) => Date.parse(`${date}T00:00:00Z`) / DAY_MS
const fromEpochDay = (n: number) => new Date(n * DAY_MS).toISOString().slice(0, 10)

/** `[year, month]` pairs from the month before `from` to `to`'s month: a statement's payment can land a month after its cutoff. */
function months(from: string, to: string): [number, number][] {
  const index = (date: string) => Number(date.slice(0, 4)) * 12 + Number(date.slice(5, 7)) - 1
  const out: [number, number][] = []
  for (let i = index(from) - 1; i <= index(to); i++) out.push([Math.floor(i / 12), (i % 12) + 1])
  return out
}

/** Every `step`-months repetition of `anchor` inside the range; never before the anchor itself. */
function monthly(anchor: string, step: number, from: string, to: string): string[] {
  const out: string[] = []
  for (let k = 0; k < 5000; k++) {
    const date = addMonthsClamped(anchor, k * step)
    if (date > to) break
    if (date >= from) out.push(date)
  }
  return out
}

/** Every `stepDays`-days repetition of `anchor` inside the range; never before the anchor itself. */
function everyDays(anchor: string, stepDays: number, from: string, to: string): string[] {
  const start = Math.max(epochDay(anchor), epochDay(from))
  const first = epochDay(anchor) + Math.ceil((start - epochDay(anchor)) / stepDays) * stepDays
  const out: string[] = []
  for (let day = first; day <= epochDay(to); day += stepDays) out.push(fromEpochDay(day))
  return out
}

function incomeDates(i: CalendarInput['incomes'][number], from: string, to: string): string[] {
  switch (i.frequency) {
    case 'once':
      return i.startsOn >= from && i.startsOn <= to ? [i.startsOn] : []
    case 'weekly':
      return everyDays(i.startsOn, 7, from, to)
    case 'biweekly':
      return everyDays(i.startsOn, 14, from, to)
    case 'monthly':
      return monthly(i.startsOn, 1, from, to)
    case 'semimonthly':
      return months(from, to)
        .flatMap(([y, m]) => [dayOf(y, m, 15), dayOf(y, m, 31)])
        .filter((d) => d >= from && d <= to && d >= i.startsOn)
  }
}

/** The payment date of each credit card statement, the charge dates of subscriptions and the registered income, in the range. */
export function calendarEvents(input: CalendarInput): CalendarEvent[] {
  const { from, to } = input
  const events: CalendarEvent[] = []

  for (const card of input.cards) {
    if (card.cutoffDay == null || card.paymentDay == null) continue
    for (const [y, m] of months(from, to)) {
      // Same rule as cardStatement: the payment is in the cutoff's month unless that day is not after the cutoff.
      const sameMonth = dayOf(y, m, card.paymentDay)
      const date = sameMonth > dayOf(y, m, card.cutoffDay) ? sameMonth : dayOf(y, m + 1, card.paymentDay)
      if (date >= from && date <= to) events.push({ date, kind: 'card_payment', title: card.name, amountCents: null, sourceId: card.id })
    }
  }

  for (const sub of input.subscriptions) {
    for (const date of monthly(sub.nextChargeAt, sub.cadence === 'yearly' ? 12 : 1, from, to)) {
      events.push({ date, kind: 'subscription', title: sub.name, amountCents: sub.amountCents, sourceId: sub.id })
    }
  }

  for (const income of input.incomes) {
    for (const date of incomeDates(income, from, to)) {
      events.push({ date, kind: 'income', title: income.name, amountCents: income.amountCents, sourceId: income.id })
    }
  }

  return events.sort((a, b) => a.date.localeCompare(b.date) || KIND_ORDER[a.kind] - KIND_ORDER[b.kind])
}
