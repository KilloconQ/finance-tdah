export function centsToUnits(cents: number): number {
  return cents / 100
}

export function unitsToCents(units: number): number {
  return Math.round(units * 100)
}

export type AmountParseResult = { ok: true; cents: number } | { ok: false; error: string }

const INVALID = { ok: false, error: 'El monto no es válido' } as const
const TOO_MANY_DECIMALS = { ok: false, error: 'El monto admite máximo 2 decimales' } as const
const SCIENTIFIC = {
  ok: false,
  error: 'No uses notación científica; escribe el monto completo',
} as const

/**
 * Parse a raw money string typed by a user into integer cents, with a Spanish
 * error when it cannot. Accepts comma or dot as decimal separator:
 * "12,50" → 1250, "1,250.50" → 125050, "1.234,50" → 123450, "1,250" → 125000.
 * When both separators appear the last one is the decimal. A lone separator is
 * thousands only if it is a comma followed by exactly 3 digits; otherwise it is
 * the decimal. More than 2 decimals and scientific notation are rejected.
 */
export function parseAmount(raw: string): AmountParseResult {
  const s = raw.trim().replace(/^\$/, '').replace(/\s/g, '')
  if (/^\d.*e[+-]?\d/i.test(s)) return SCIENTIFIC
  if (!/^[\d.,]+$/.test(s) || !/\d/.test(s)) return INVALID

  const lastDot = s.lastIndexOf('.')
  const lastComma = s.lastIndexOf(',')
  const last = Math.max(lastDot, lastComma)
  const sepCount = (c: string) => s.split(c).length - 1

  let decimalIdx = -1
  if (lastDot >= 0 && lastComma >= 0) {
    decimalIdx = last
  } else if (last >= 0) {
    const c = s[last]
    const after = s.length - last - 1
    if (sepCount(c) > 1) decimalIdx = -1
    else if (c === ',' && after === 3 && last >= 1 && last <= 3) decimalIdx = -1
    else decimalIdx = last
  }

  const intPart = decimalIdx >= 0 ? s.slice(0, decimalIdx) : s
  const decPart = decimalIdx >= 0 ? s.slice(decimalIdx + 1) : ''
  if (decPart.length > 2) return /^\d+$/.test(decPart) ? TOO_MANY_DECIMALS : INVALID
  if (decPart !== '' && !/^\d+$/.test(decPart)) return INVALID

  // Remaining separators in the integer part are thousands: groups of exactly 3.
  if (!/^\d{1,3}([.,]\d{3})+$/.test(intPart) && !/^\d*$/.test(intPart)) return INVALID
  const groups = intPart.split(/[.,]/)
  if (groups.length > 1 && new Set(intPart.replace(/\d/g, '')).size > 1) return INVALID

  const units = Number(`${groups.join('')}.${decPart || '0'}`)
  if (!Number.isFinite(units) || units <= 0) return INVALID
  return { ok: true, cents: unitsToCents(units) }
}

/** Like {@link parseAmount} but returns null on any failure. */
export function parseAmountToCents(raw: string): number | null {
  const r = parseAmount(raw)
  return r.ok ? r.cents : null
}

/** Specific format error (decimals / scientific notation) or null, so callers keep their own generic message. */
export function amountFormatError(raw: string): string | null {
  const r = parseAmount(raw)
  return !r.ok && (r.error === TOO_MANY_DECIMALS.error || r.error === SCIENTIFIC.error)
    ? r.error
    : null
}
