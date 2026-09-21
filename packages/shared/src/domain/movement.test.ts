import { describe, expect, it } from 'vitest'
import { sourceBalanceDeltaCents } from './movement'

describe('sourceBalanceDeltaCents', () => {
  it('subtracts from the source account for an expense', () => {
    expect(sourceBalanceDeltaCents('expense', 5_000)).toBe(-5_000)
  })

  it('adds to the source account for an income', () => {
    expect(sourceBalanceDeltaCents('income', 5_000)).toBe(5_000)
  })

  it('subtracts from the source account for a transfer', () => {
    expect(sourceBalanceDeltaCents('transfer', 5_000)).toBe(-5_000)
  })
})
