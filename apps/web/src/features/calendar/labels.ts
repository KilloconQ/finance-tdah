import type { AlertKind, CalendarEventKind, IncomeFrequency } from '@finance-tdah/shared/domain'

export const KIND_LABEL: Record<CalendarEventKind, string> = {
  card_payment: 'Pago de tarjeta',
  subscription: 'Suscripción',
  income: 'Ingreso',
}

/** Dot colors: what leaves is red or neutral, what comes in is green. */
export const KIND_DOT: Record<CalendarEventKind, string> = {
  card_payment: 'bg-danger',
  subscription: 'bg-warn',
  income: 'bg-good',
}

export const FREQUENCY_LABEL: Record<IncomeFrequency, string> = {
  once: 'Una vez',
  weekly: 'Cada semana',
  biweekly: 'Cada 14 días',
  semimonthly: 'Quincenal (15 y último)',
  monthly: 'Cada mes',
}

export const ALERT_LABEL: Record<AlertKind, string> = {
  income: 'Cuando me toca cobrar',
  card_cutoff: 'Corte de tarjeta',
  card_payment: 'Pago de tarjeta',
  subscription_monthly: 'Suscripciones mensuales',
  subscription_yearly: 'Suscripciones anuales',
}

export const DAYS_BEFORE_OPTIONS = [...Array.from({ length: 15 }, (_, d) => d), 21, 30]

export const daysBeforeLabel = (d: number) => (d === 0 ? 'El mismo día' : d === 1 ? '1 día antes' : `${d} días antes`)

export function hourLabel(h: number): string {
  return `${h % 12 === 0 ? 12 : h % 12}:00 ${h < 12 ? 'am' : 'pm'}`
}
