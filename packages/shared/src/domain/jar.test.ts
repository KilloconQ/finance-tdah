import { describe, expect, it } from 'vitest'
import { jarProgress } from './jar'

describe('jarProgress', () => {
  it('returns 0% when nothing has been saved', () => {
    const p = jarProgress({ currentCents: 0, targetCents: 500_000 })
    expect(p.percent).toBe(0)
    expect(p.isComplete).toBe(false)
    expect(p.overflowCents).toBe(0)
  })

  it('returns the exact ratio when partially filled', () => {
    const p = jarProgress({ currentCents: 310_000, targetCents: 500_000 })
    expect(p.percent).toBeCloseTo(62, 2)
    expect(p.fraction).toBeCloseTo(0.62, 4)
    expect(p.isComplete).toBe(false)
    expect(p.overflowCents).toBe(0)
  })

  it('caps percent at 100 when current exceeds target', () => {
    const p = jarProgress({ currentCents: 600_000, targetCents: 500_000 })
    expect(p.percent).toBe(100)
    expect(p.fraction).toBe(1)
    expect(p.isComplete).toBe(true)
    expect(p.overflowCents).toBe(100_000)
  })

  it('marks complete when current equals target', () => {
    const p = jarProgress({ currentCents: 500_000, targetCents: 500_000 })
    expect(p.percent).toBe(100)
    expect(p.isComplete).toBe(true)
    expect(p.overflowCents).toBe(0)
  })

  it('handles a target of zero without dividing by zero', () => {
    const p = jarProgress({ currentCents: 100_000, targetCents: 0 })
    expect(p.percent).toBe(0)
    expect(p.fraction).toBe(0)
    expect(p.isComplete).toBe(false)
    expect(p.overflowCents).toBe(0)
  })

  it('handles a negative current as zero (defensive)', () => {
    const p = jarProgress({ currentCents: -100, targetCents: 500_000 })
    expect(p.percent).toBe(0)
    expect(p.fraction).toBe(0)
  })
})
