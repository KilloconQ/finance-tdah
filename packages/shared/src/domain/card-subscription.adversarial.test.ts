import { describe, expect, it } from 'vitest'
import { cardStatement } from './card-statement'
import { chargeAlertDue, nextChargeOnOrAfter } from './subscription'

const ISO = /^\d{4}-\d{2}-\d{2}$/
const days = (from: string, n: number) => {
  const d = new Date(`${from}T00:00:00Z`)
  return Array.from({ length: n }, (_, i) => new Date(d.getTime() + i * 86_400_000).toISOString().slice(0, 10))
}

const plus = (date: string, n: number) =>
  new Date(new Date(`${date}T00:00:00Z`).getTime() + n * 86_400_000).toISOString().slice(0, 10)

describe('cardStatement invariants (every cutoff/payment pair, across a leap year)', () => {
  // 2024 is a leap year; the sweep also crosses the year boundary.
  const todays = days('2024-01-01', 800).filter((_, i) => i % 3 === 0)

  it('always returns a sane statement', () => {
    // Failures are collected, not asserted one by one: this runs ~130k combinations.
    const bad: string[] = []
    for (let cutoffDay = 1; cutoffDay <= 31; cutoffDay++) {
      for (let paymentDay = 1; paymentDay <= 31; paymentDay += 2) {
        for (const today of todays) {
          const s = cardStatement({ cutoffDay, paymentDay, today, purchases: [], payments: [] })
          const ok =
            [s.cutoffDate, s.paymentDate, s.nextCutoffDate].every((d) => ISO.test(d)) &&
            // The statement closed on or before today and the open period closes after it.
            s.cutoffDate <= today &&
            s.nextCutoffDate > today &&
            // You pay after the statement closes, and within about two months of it.
            s.paymentDate > s.cutoffDate &&
            s.paymentDate <= plus(s.cutoffDate, 62)
          if (!ok) bad.push(JSON.stringify({ cutoffDay, paymentDay, today, s }))
        }
      }
    }
    expect(bad.slice(0, 3)).toEqual([])
  })

  it('splits purchases exactly at the cutoff day: on the day closes, the day after rolls over', () => {
    const base = { cutoffDay: 31, paymentDay: 15, today: '2026-03-05', payments: [] }
    // Feb 2026 has 28 days, so the cutoff is Feb 28 and the previous one Jan 31.
    const s = cardStatement({
      ...base,
      purchases: [
        { date: '2026-01-31', cents: 1 }, // previous statement
        { date: '2026-02-01', cents: 10 }, // closed
        { date: '2026-02-28', cents: 100 }, // cutoff day: closed
        { date: '2026-03-01', cents: 1000 }, // open
      ],
    })
    expect(s.cutoffDate).toBe('2026-02-28')
    expect(s.dueCents).toBe(110)
    expect(s.openPeriodCents).toBe(1000)
  })

  it('never reports a negative amount due, whatever is paid', () => {
    const s = cardStatement({
      cutoffDay: 10,
      paymentDay: 25,
      today: '2026-11-15',
      purchases: [{ date: '2026-11-01', cents: 100 }],
      payments: [{ date: '2026-11-12', cents: Number.MAX_SAFE_INTEGER }],
    })
    expect(s.dueCents).toBe(0)
  })

  it('a payment on the cutoff day itself belongs to the previous statement', () => {
    const s = cardStatement({
      cutoffDay: 10,
      paymentDay: 25,
      today: '2026-11-15',
      purchases: [{ date: '2026-11-01', cents: 500 }],
      payments: [{ date: '2026-11-10', cents: 500 }],
    })
    expect(s.dueCents).toBe(500)
  })

  it('ignores movements dated in the future of the open period or absurdly old', () => {
    const s = cardStatement({
      cutoffDay: 10,
      paymentDay: 25,
      today: '2026-11-15',
      purchases: [
        { date: '1999-01-01', cents: 777 },
        { date: '2099-01-01', cents: 5 },
      ],
      payments: [],
    })
    expect(s.dueCents).toBe(0)
    expect(s.openPeriodCents).toBe(5) // a future-dated purchase is still after the cutoff
  })
})

describe('nextChargeOnOrAfter invariants', () => {
  const starts = ['2020-01-31', '2024-02-29', '2023-12-31', '2026-11-30', '2000-06-15']
  it('lands on or after today, on the original schedule, and is idempotent', () => {
    for (const start of starts) {
      for (const cadence of ['monthly', 'yearly'] as const) {
        for (const today of days('2026-01-01', 400).filter((_, i) => i % 7 === 0)) {
          const next = nextChargeOnOrAfter(start, cadence, today)
          const ctx = JSON.stringify({ start, cadence, today, next })
          expect(next >= today, ctx).toBe(true)
          expect(nextChargeOnOrAfter(next, cadence, today), ctx).toBe(next)
          // It is the FIRST one on the schedule: the day before today is not a charge date after it.
          expect(next <= plus(today, 400), ctx).toBe(true)
          if (cadence === 'monthly') expect(Number(next.slice(8)) <= Number(start.slice(8)), ctx).toBe(true)
        }
      }
    }
  })

  it('a 29 February subscription returns to the 29th in leap years', () => {
    expect(nextChargeOnOrAfter('2024-02-29', 'yearly', '2025-03-01')).toBe('2026-02-28')
    expect(nextChargeOnOrAfter('2024-02-29', 'yearly', '2027-03-01')).toBe('2028-02-29')
  })

  it('finishes quickly for a charge date a century old', () => {
    const t = Date.now()
    expect(nextChargeOnOrAfter('1926-01-31', 'monthly', '2026-11-20')).toBe('2026-11-30')
    expect(Date.now() - t).toBeLessThan(200)
  })
})

describe('chargeAlertDue never fires outside its window', () => {
  it('only inside [day before, charge day], at or after the hour, once', () => {
    const nextChargeAt = '2026-03-01'
    for (const today of days('2026-02-20', 15)) {
      for (const hour of [0, 8, 9, 23]) {
        const due = chargeAlertDue({ nextChargeAt, today, hour, reminderHour: 9, lastAlertedFor: null })
        const inWindow = today === '2026-02-28' || today === '2026-03-01'
        expect(due, `${today} ${hour}`).toBe(inWindow && hour >= 9)
      }
    }
  })
})
