import { describe, expect, it } from 'vitest'
import { centsToUnits, unitsToCents } from './money'

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
