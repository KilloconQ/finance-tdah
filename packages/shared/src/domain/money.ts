export function centsToUnits(cents: number): number {
  return cents / 100
}

export function unitsToCents(units: number): number {
  return Math.round(units * 100)
}

/**
 * Parse a raw money string typed by a user (MX locale: comma = thousands
 * separator, dot = decimal) into integer cents. Returns null for anything
 * that is not a positive amount, so callers can show a validation error.
 *
 * Examples: "180" → 18000, "1,200.50" → 120050, "$65" → 6500, "" → null.
 */
export function parseAmountToCents(raw: string): number | null {
  const trimmed = raw.trim()
  if (trimmed.startsWith('-')) return null

  const cleaned = trimmed.replace(/[^0-9.]/g, '')
  if (cleaned === '' || cleaned === '.') return null

  const units = Number(cleaned)
  if (!Number.isFinite(units) || units <= 0) return null

  return unitsToCents(units)
}
