import { parseAmountToCents } from '@finance-tdah/shared/domain'
import { describe, expect, it } from 'vitest'
import { formatAmountInput } from './format'

describe('formatAmountInput', () => {
  it.each([
    ['', ''],
    ['5', '5'],
    ['1234', '1,234'],
    ['1,2345', '12,345'],
    ['1234567.5', '1,234,567.5'],
    ['1234.567', '1,234.567'],
    ['.5', '0.5'],
    ['007', '7'],
    ['$1 500', '1,500'],
    ['12,5', '12.5'],
    ['12,50', '12.50'],
    ['1,234', '1,234'],
    ['abc', 'abc'],
    ['1.2.3', '1.2.3'],
  ])('%j → %j', (raw, expected) => {
    expect(formatAmountInput(raw)).toBe(expected)
  })

  it('keeps a thousands comma while deleting', () => {
    expect(formatAmountInput('1,23', true)).toBe('123')
  })

  it('is idempotent and round-trips through the parser', () => {
    for (const raw of ['1234567.89', '1000', '999', '12,5']) {
      const once = formatAmountInput(raw)
      expect(formatAmountInput(once, true)).toBe(once)
      expect(parseAmountToCents(once)).toBe(parseAmountToCents(raw.replace(',', '.')))
    }
  })
})
