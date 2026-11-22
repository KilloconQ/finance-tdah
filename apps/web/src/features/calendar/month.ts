export interface YearMonth {
  year: number
  month: number
}

const pad = (n: number) => String(n).padStart(2, '0')

export function monthBounds(year: number, month: number) {
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate()
  // Monday-first week: Sunday (0) becomes 6.
  const leadingBlanks = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7
  return { from: `${year}-${pad(month)}-01`, to: `${year}-${pad(month)}-${pad(days)}`, leadingBlanks, days }
}

export function shiftMonth({ year, month }: YearMonth, delta: number): YearMonth {
  const index = year * 12 + (month - 1) + delta
  return { year: Math.floor(index / 12), month: (index % 12) + 1 }
}

export const monthOf = (isoDate: string): YearMonth => ({ year: Number(isoDate.slice(0, 4)), month: Number(isoDate.slice(5, 7)) })

/** "noviembre de 2026", from a date that carries no time zone. */
export const monthLabel = ({ year, month }: YearMonth) =>
  new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('es-MX', { month: 'long', year: 'numeric', timeZone: 'UTC' })
