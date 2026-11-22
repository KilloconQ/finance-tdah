import { describe, expect, it } from 'vitest'
import { monthBounds, shiftMonth } from './month'

describe('monthBounds', () => {
  it('gives the first and last day and where the week starts (Monday first)', () => {
    // November 2026 starts on a Sunday: six blanks before the 1st.
    expect(monthBounds(2026, 11)).toEqual({ from: '2026-11-01', to: '2026-11-30', leadingBlanks: 6, days: 30 })
    // June 2026 starts on a Monday.
    expect(monthBounds(2026, 6)).toMatchObject({ leadingBlanks: 0 })
  })

  it('knows leap years', () => {
    expect(monthBounds(2028, 2)).toMatchObject({ to: '2028-02-29', days: 29 })
    expect(monthBounds(2027, 2)).toMatchObject({ to: '2027-02-28', days: 28 })
  })
})

describe('shiftMonth', () => {
  it('crosses year boundaries', () => {
    expect(shiftMonth({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 })
    expect(shiftMonth({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 })
  })
})
