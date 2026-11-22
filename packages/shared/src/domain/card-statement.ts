/**
 * Credit-card statement rules. Purchases up to and including the cutoff day belong to that
 * statement and are paid on the following payment day; later purchases roll into the next
 * period. Dates are plain local calendar days ('YYYY-MM-DD') so the caller decides the timezone.
 */

export interface CardMovement {
  /** Local calendar day the movement happened. */
  date: string
  cents: number
}

export interface CardStatementInput {
  cutoffDay: number
  paymentDay: number
  /** Local calendar day to evaluate at. */
  today: string
  /** Money spent on the card (positive cents). */
  purchases: CardMovement[]
  /** Money paid into the card (positive cents). */
  payments: CardMovement[]
}

export interface CardStatement {
  /** Cutoff that closed the statement being paid. */
  cutoffDate: string
  /** When that statement is due. */
  paymentDate: string
  /** What is left to pay for it: its purchases minus payments made since the cutoff. */
  dueCents: number
  /** Spent since that cutoff; it lands on the next statement. */
  openPeriodCents: number
  /** When the open period closes. */
  nextCutoffDate: string
}

const pad = (n: number) => String(n).padStart(2, '0')

// Day `day` of a month, clamped to the month's length (day 31 -> Feb 28).
export function dayOf(year: number, month: number, day: number): string {
  const y = year + Math.floor((month - 1) / 12)
  const m = ((((month - 1) % 12) + 12) % 12) + 1
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate()
  return `${y}-${pad(m)}-${pad(Math.min(day, last))}`
}

const sum = (items: CardMovement[], keep: (date: string) => boolean) =>
  items.reduce((total, i) => (keep(i.date) ? total + i.cents : total), 0)

// ponytail: only the latest closed statement is tracked, an unpaid older one is not carried over.
export function cardStatement(input: CardStatementInput): CardStatement {
  const { cutoffDay, paymentDay, today, purchases, payments } = input
  const year = Number(today.slice(0, 4))
  const month = Number(today.slice(5, 7))

  // ISO dates compare correctly as strings.
  const thisCutoff = dayOf(year, month, cutoffDay)
  const lastIsThisMonth = thisCutoff <= today
  const [ly, lm] = lastIsThisMonth ? [year, month] : [year, month - 1]

  const cutoffDate = dayOf(ly, lm, cutoffDay)
  const previousCutoff = dayOf(ly, lm - 1, cutoffDay)
  const nextCutoffDate = dayOf(ly, lm + 1, cutoffDay)
  // Same month as the cutoff when the payment day comes after it, otherwise the next one. Compared
  // on the clamped dates: with cutoff 28 and payment 29, February clamps both to the 28th.
  const sameMonth = dayOf(ly, lm, paymentDay)
  const paymentDate = sameMonth > cutoffDate ? sameMonth : dayOf(ly, lm + 1, paymentDay)

  const statementCents = sum(purchases, (d) => d > previousCutoff && d <= cutoffDate)
  const paidSince = sum(payments, (d) => d > cutoffDate)

  return {
    cutoffDate,
    paymentDate,
    dueCents: Math.max(0, statementCents - paidSince),
    openPeriodCents: sum(purchases, (d) => d > cutoffDate),
    nextCutoffDate,
  }
}
