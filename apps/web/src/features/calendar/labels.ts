import type { CalendarEventKind, IncomeFrequency } from '@finance-tdah/shared/domain'

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
