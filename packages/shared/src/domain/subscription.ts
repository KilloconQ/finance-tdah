import type { SubscriptionCadence } from '../types'

/**
 * What a subscription costs, by the period it is billed in. `amountCents` is the
 * price of ONE billing period, so a yearly plan of $1,200 is $100 a month — adding
 * the raw amounts of monthly and yearly plans together overstates a yearly one 12×.
 */

const MONTHS_PER_YEAR = 12
// Same 30-day month the app already uses to price a stretch of days; a year is 365.
const DAYS_PER_PERIOD: Record<SubscriptionCadence, number> = { monthly: 30, yearly: 365 }

/** What it costs over a full year. */
export function yearlyCostCents(amountCents: number, cadence: SubscriptionCadence): number {
  return cadence === 'yearly' ? amountCents : amountCents * MONTHS_PER_YEAR
}

/** What it costs per month (a yearly plan, a twelfth), rounded to the cent. */
export function monthlyCostCents(amountCents: number, cadence: SubscriptionCadence): number {
  return cadence === 'yearly' ? Math.round(amountCents / MONTHS_PER_YEAR) : amountCents
}

/** What it cost over `days` days, e.g. since it was last used. */
export function costOverDaysCents(amountCents: number, cadence: SubscriptionCadence, days: number): number {
  return Math.round((days / DAYS_PER_PERIOD[cadence]) * amountCents)
}

/**
 * Charge dates and the heads-up before one. Dates are plain calendar days ('YYYY-MM-DD')
 * in the user's time zone; ISO dates compare correctly as strings.
 */

const pad = (n: number) => String(n).padStart(2, '0')

// `months` after `date`, clamped to the target month's length (Jan 31 + 1 -> Feb 28).
function addMonthsClamped(date: string, months: number): string {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number]
  const index = y * 12 + (m - 1) + months
  const year = Math.floor(index / 12)
  const month = (index % 12) + 1
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate()
  return `${year}-${pad(month)}-${pad(Math.min(d, last))}`
}

function dayBefore(date: string): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

/** The first charge on `date`'s schedule that is today or later. */
export function nextChargeOnOrAfter(date: string, cadence: SubscriptionCadence, today: string): string {
  const step = cadence === 'yearly' ? 12 : 1
  let next = date
  // Counted from the original date so a 31st does not drift to the 28th for good.
  for (let k = 1; next < today; k++) next = addMonthsClamped(date, k * step)
  return next
}

export interface ChargeAlertInput {
  nextChargeAt: string
  today: string
  hour: number
  reminderHour: number
  /** The charge date already alerted, so each charge alerts once. */
  lastAlertedFor: string | null
}

/** True from the day before a charge until the charge day, at the user's reminder hour. */
export function chargeAlertDue(i: ChargeAlertInput): boolean {
  if (i.lastAlertedFor !== null && i.lastAlertedFor >= i.nextChargeAt) return false
  if (i.today > i.nextChargeAt || i.today < dayBefore(i.nextChargeAt)) return false
  return i.hour >= i.reminderHour
}
