import { afterEach, describe, expect, it, vi } from 'vitest'
import { daysAgo, formatMoney, formatMoneyDelta } from './format'

describe('formatMoney', () => {
  it('formats pesos with a bare $ and grouping', () => {
    expect(formatMoney(1234.5)).toBe('$1,234.50')
    expect(formatMoney(0)).toBe('$0.00')
  })

  it('masks the amount when hidden', () => {
    expect(formatMoney(1234.5, true)).toBe('••••')
  })
})

describe('formatMoneyDelta', () => {
  it('prefixes the sign, using a real minus for negatives', () => {
    expect(formatMoneyDelta(50)).toBe('+$50.00')
    expect(formatMoneyDelta(-50)).toBe('−$50.00')
    expect(formatMoneyDelta(0)).toBe('$0.00')
  })

  it('masks the amount when hidden', () => {
    expect(formatMoneyDelta(-50, true)).toBe('••••')
  })
})

describe('daysAgo', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('counts whole days elapsed, from a Date or an ISO string', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-28T12:00:00Z'))
    expect(daysAgo(new Date('2026-09-28T01:00:00Z'))).toBe(0)
    expect(daysAgo('2026-09-27T12:00:00Z')).toBe(1)
    expect(daysAgo('2026-09-20T13:00:00Z')).toBe(7)
  })
})
