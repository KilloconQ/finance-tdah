const MXN = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  maximumFractionDigits: 0,
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
