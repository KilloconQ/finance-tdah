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
