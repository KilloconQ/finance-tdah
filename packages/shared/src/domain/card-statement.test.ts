import { describe, expect, it } from 'vitest'
import { cardStatement } from './card-statement'

// Cutoff on the 10th, payment on the 25th.
const card = { cutoffDay: 10, paymentDay: 25 }

describe('cardStatement', () => {
  it('only charges what was bought up to the cutoff on the next payment date', () => {
    const s = cardStatement({
      ...card,
      today: '2026-11-15',
      purchases: [
        { date: '2026-10-20', cents: 100_000 }, // closed period (Oct 11 - Nov 10)
        { date: '2026-11-10', cents: 50_000 }, // cutoff day still counts in this period
        { date: '2026-11-12', cents: 150_000 }, // after the cutoff: next period
      ],
      payments: [],
    })
    expect(s.cutoffDate).toBe('2026-11-10')
    expect(s.paymentDate).toBe('2026-11-25')
    expect(s.dueCents).toBe(150_000)
    expect(s.openPeriodCents).toBe(150_000)
    expect(s.nextCutoffDate).toBe('2026-12-10')
  })

  it('ignores purchases from before the previous cutoff', () => {
    const s = cardStatement({
      ...card,
      today: '2026-11-15',
      purchases: [{ date: '2026-10-10', cents: 99_999 }],
      payments: [],
    })
    expect(s.dueCents).toBe(0)
  })

  it('subtracts payments made after the cutoff and never goes below zero', () => {
    const base = { ...card, today: '2026-11-15', purchases: [{ date: '2026-11-01', cents: 100_000 }] }
    expect(cardStatement({ ...base, payments: [{ date: '2026-11-14', cents: 40_000 }] }).dueCents).toBe(60_000)
    expect(cardStatement({ ...base, payments: [{ date: '2026-11-14', cents: 500_000 }] }).dueCents).toBe(0)
    // A payment before the cutoff belongs to the previous statement.
    expect(cardStatement({ ...base, payments: [{ date: '2026-11-09', cents: 40_000 }] }).dueCents).toBe(100_000)
  })

  it('pays in the following month when the payment day is not after the cutoff day', () => {
    const s = cardStatement({ cutoffDay: 25, paymentDay: 10, today: '2026-11-26', purchases: [], payments: [] })
    expect(s.cutoffDate).toBe('2026-11-25')
    expect(s.paymentDate).toBe('2026-12-10')
  })

  it('uses the previous month cutoff before this month cutoff is reached', () => {
    const s = cardStatement({ ...card, today: '2026-11-05', purchases: [], payments: [] })
    expect(s.cutoffDate).toBe('2026-10-10')
    expect(s.paymentDate).toBe('2026-10-25')
    expect(s.nextCutoffDate).toBe('2026-11-10')
  })

  it('clamps day 31 to the last day of short months and handles the year boundary', () => {
    const s = cardStatement({ cutoffDay: 31, paymentDay: 15, today: '2026-03-01', purchases: [], payments: [] })
    expect(s.cutoffDate).toBe('2026-02-28')
    expect(s.paymentDate).toBe('2026-03-15')
    const jan = cardStatement({ cutoffDay: 10, paymentDay: 25, today: '2026-01-05', purchases: [], payments: [] })
    expect(jan.cutoffDate).toBe('2025-12-10')
  })
})
