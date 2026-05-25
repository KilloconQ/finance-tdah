import { describe, expect, it } from 'vitest'
import { signedBalanceForType } from './account'

describe('signedBalanceForType', () => {
  it('stores a credit-card balance as debt (negative)', () => {
    expect(signedBalanceForType('credito', 289_000)).toBe(-289_000)
  })

  it('keeps money-holding accounts positive', () => {
    expect(signedBalanceForType('debito', 842_000)).toBe(842_000)
    expect(signedBalanceForType('efectivo', 35_000)).toBe(35_000)
    expect(signedBalanceForType('wallet', 124_000)).toBe(124_000)
    expect(signedBalanceForType('ahorro', 310_000)).toBe(310_000)
  })

  it('normalizes the entered magnitude regardless of sign', () => {
    expect(signedBalanceForType('credito', -289_000)).toBe(-289_000)
    expect(signedBalanceForType('debito', -50_000)).toBe(50_000)
  })

  it('handles a zero balance', () => {
    expect(signedBalanceForType('credito', 0)).toBe(0)
    expect(signedBalanceForType('debito', 0)).toBe(0)
  })
})
