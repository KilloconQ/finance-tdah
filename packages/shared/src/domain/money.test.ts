import { describe, expect, it } from 'vitest'
import { amountFormatError, centsToUnits, parseAmount, parseAmountToCents, unitsToCents } from './money'

describe('centsToUnits', () => {
  it('converts whole pesos', () => {
    expect(centsToUnits(10_000)).toBe(100)
  })

  it('converts zero', () => {
    expect(centsToUnits(0)).toBe(0)
  })

  it('keeps two decimals when present', () => {
    expect(centsToUnits(12_345)).toBeCloseTo(123.45, 2)
  })
})

describe('unitsToCents', () => {
  it('converts whole pesos to cents', () => {
    expect(unitsToCents(100)).toBe(10_000)
  })

  it('rounds to avoid floating-point drift', () => {
    expect(unitsToCents(123.456)).toBe(12_346)
  })

  it('round-trips cleanly with centsToUnits', () => {
    const original = 49_999
    expect(unitsToCents(centsToUnits(original))).toBe(original)
  })
})

describe('parseAmountToCents', () => {
  it('parses whole pesos', () => {
    expect(parseAmountToCents('180')).toBe(18_000)
  })

  it('parses decimals', () => {
    expect(parseAmountToCents('180.50')).toBe(18_050)
  })

  it('strips thousands separators (MX locale: comma)', () => {
    expect(parseAmountToCents('1,200.50')).toBe(120_050)
  })

  it('strips currency symbols and surrounding whitespace', () => {
    expect(parseAmountToCents('  $65 ')).toBe(6_500)
  })

  it('treats a comma decimal as decimal, not thousands', () => {
    expect(parseAmountToCents('12,50')).toBe(1_250)
    expect(parseAmountToCents('0,5')).toBe(50)
  })

  it('handles European format (dot thousands, comma decimal)', () => {
    expect(parseAmountToCents('1.234,50')).toBe(123_450)
  })

  it('keeps comma thousands with dot decimals and bare thousands', () => {
    expect(parseAmountToCents('1,250.50')).toBe(125_050)
    expect(parseAmountToCents('1,250')).toBe(125_000)
    expect(parseAmountToCents('1,234,567.89')).toBe(123_456_789)
  })

  it('rejects more than 2 decimals instead of rounding', () => {
    expect(parseAmountToCents('12.999')).toBeNull()
    expect(parseAmountToCents('10.555')).toBeNull()
    expect(parseAmount('10.555')).toEqual({
      ok: false,
      error: 'El monto admite máximo 2 decimales',
    })
    expect(parseAmount('10,5555')).toEqual({
      ok: false,
      error: 'El monto admite máximo 2 decimales',
    })
  })

  it('rejects scientific notation', () => {
    expect(parseAmountToCents('1e9')).toBeNull()
    expect(parseAmount('1e9')).toEqual({
      ok: false,
      error: 'No uses notación científica; escribe el monto completo',
    })
  })

  it('returns a Spanish error for invalid input', () => {
    expect(parseAmount('abc')).toEqual({ ok: false, error: 'El monto no es válido' })
    expect(parseAmount('180')).toEqual({ ok: true, cents: 18_000 })
  })

  it('returns null for empty or non-numeric input', () => {
    expect(parseAmountToCents('')).toBeNull()
    expect(parseAmountToCents('   ')).toBeNull()
    expect(parseAmountToCents('abc')).toBeNull()
    expect(parseAmountToCents('.')).toBeNull()
    expect(parseAmountToCents('1.2.3')).toBeNull()
  })

  it('returns null for zero or negative amounts', () => {
    expect(parseAmountToCents('0')).toBeNull()
    expect(parseAmountToCents('-5')).toBeNull()
  })
})

describe('amountFormatError', () => {
  it('only reports decimals and scientific notation', () => {
    expect(amountFormatError('10.555')).toBe('El monto admite máximo 2 decimales')
    expect(amountFormatError('1e9')).toContain('notación científica')
    expect(amountFormatError('abc')).toBeNull()
    expect(amountFormatError('0')).toBeNull()
    expect(amountFormatError('12,50')).toBeNull()
  })
})
