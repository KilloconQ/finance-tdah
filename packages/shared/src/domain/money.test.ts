import { describe, expect, it } from 'vitest'
import { centsToUnits, parseAmountToCents, unitsToCents } from './money'

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

  it('rounds sub-cent precision', () => {
    expect(parseAmountToCents('12.999')).toBe(1_300)
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
