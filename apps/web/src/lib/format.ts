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

/** Today's date in the user's timezone as YYYY-MM-DD. */
export const todayLocalISO = () => new Date().toLocaleDateString('en-CA')

/** "1 día" / "3 días". */
export function formatDays(n: number): string {
  return `${n} ${n === 1 ? 'día' : 'días'}`
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

/**
 * Live formatting for money inputs: groups the integer part by thousands with
 * commas ("1234567.5" → "1,234,567.5") while the user types. The dot is the
 * decimal separator. A lone comma with 1-2 digits after it is a decimal comma
 * ("12,5" → "12.5"), unless the user is deleting, when it is still a thousands
 * comma we inserted ("1,23" came from "1,234"). Anything that is not a plain
 * number (letters, "1.2.3", 3+ decimals) is returned untouched so the form
 * validation can still explain what is wrong. The output round-trips through
 * `parseAmountToCents`.
 */
export function formatAmountInput(raw: string, deleting = false): string {
  let s = raw.replace(/[\s$]/g, '')
  const commas = s.split(',').length - 1
  if (!s.includes('.') && commas === 1 && !deleting) {
    const after = s.length - s.indexOf(',') - 1
    if (after <= 2) s = s.replace(',', '.')
  }
  s = s.replace(/,/g, '')
  if (!/^\d*(\.\d*)?$/.test(s)) return raw
  const dot = s.indexOf('.')
  const intRaw = dot >= 0 ? s.slice(0, dot) : s
  const int = intRaw.replace(/^0+(?=\d)/, '').replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return dot >= 0 ? `${int === '' ? '0' : int}.${s.slice(dot + 1)}` : int
}
