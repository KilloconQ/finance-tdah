import type { AccountType } from '@finance-tdah/shared/domain'

type StatementDays = { ok: true; cutoffDay: number | null; paymentDay: number | null } | { ok: false; error: string }

/** Reads the credit card's cutoff and payment days from the form: both set, or both empty. */
export function parseStatementDays(type: AccountType, cutoff?: string, payment?: string): StatementDays {
  if (type !== 'credito' || (!cutoff && !payment)) return { ok: true, cutoffDay: null, paymentDay: null }
  if (!cutoff || !payment) {
    return { ok: false, error: 'Pon el día de corte y el de pago, o deja los dos vacíos' }
  }
  const cutoffDay = Number(cutoff)
  const paymentDay = Number(payment)
  const valid = (d: number) => Number.isInteger(d) && d >= 1 && d <= 31
  if (!valid(cutoffDay) || !valid(paymentDay)) return { ok: false, error: 'Los días van del 1 al 31' }
  return { ok: true, cutoffDay, paymentDay }
}
