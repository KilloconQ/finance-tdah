const MXN = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  maximumFractionDigits: 2,
})

export function formatMoney(value: number, hidden = false): string {
  if (hidden) return '••••'
  return MXN.format(value).replace('MX$', '$')
}

export function formatMoneyDelta(value: number, hidden = false): string {
  if (hidden) return '••••'
  const sign = value > 0 ? '+' : value < 0 ? '−' : ''
  return `${sign}${MXN.format(Math.abs(value)).replace('MX$', '$')}`
}

export function daysAgo(date: Date | string): number {
  const d = typeof date === 'string' ? new Date(date) : date
  const diff = Date.now() - d.getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

// Formats a date-only 'YYYY-MM-DD' string as that same calendar day. Parsing it
// with `new Date(str)` reads it as UTC midnight, which shows the previous day in
// timezones behind UTC (e.g. Mexico).
export function formatDateOnly(
  date: string,
  options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' },
): string {
  const [y, m, d] = date.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es-MX', options)
}
