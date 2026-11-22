import { describe, expect, it } from 'vitest'
import { calendarEvents, type CalendarInput } from './calendar'

const empty: CalendarInput = { from: '2026-11-01', to: '2026-11-30', cards: [], subscriptions: [], incomes: [] }
const run = (over: Partial<CalendarInput>) => calendarEvents({ ...empty, ...over })
const dates = (over: Partial<CalendarInput>) => run(over).map((e) => e.date)

describe('card payments', () => {
  const card = { id: 'c1', name: 'Visa', cutoffDay: 15, paymentDay: 5 }

  it('lists the payment date of each statement that falls in the range', () => {
    // Statement closing Nov 15 is due Dec 5; the one closing Oct 15 is due Nov 5.
    expect(run({ cards: [card] })).toEqual([
      { date: '2026-11-05', kind: 'card_payment', title: 'Visa', amountCents: null, sourceId: 'c1' },
    ])
    expect(dates({ cards: [card], from: '2026-11-01', to: '2027-01-31' })).toEqual(['2026-11-05', '2026-12-05', '2027-01-05'])
  })

  it('pays in the same month when the payment day is after the cutoff day', () => {
    expect(dates({ cards: [{ ...card, cutoffDay: 5, paymentDay: 25 }] })).toEqual(['2026-11-25'])
  })

  it('clamps to the month length', () => {
    expect(dates({ cards: [{ ...card, cutoffDay: 20, paymentDay: 31 }], from: '2027-02-01', to: '2027-02-28' })).toEqual(['2027-02-28'])
  })

  it('ignores a card without statement days', () => {
    expect(dates({ cards: [{ ...card, cutoffDay: null }, { ...card, paymentDay: null }] })).toEqual([])
  })
})

describe('subscriptions', () => {
  const netflix = { id: 's1', name: 'Netflix', amountCents: 19_900, cadence: 'monthly' as const, nextChargeAt: '2026-11-10' }

  it('repeats a monthly charge from its next charge date', () => {
    expect(dates({ subscriptions: [netflix], to: '2027-01-31' })).toEqual(['2026-11-10', '2026-12-10', '2027-01-10'])
    expect(run({ subscriptions: [netflix] })[0]).toMatchObject({ kind: 'subscription', title: 'Netflix', amountCents: 19_900, sourceId: 's1' })
  })

  it('does not invent charges before the next charge date', () => {
    expect(dates({ subscriptions: [{ ...netflix, nextChargeAt: '2026-12-10' }] })).toEqual([])
  })

  it('keeps the original day after a short month', () => {
    const sub = { ...netflix, nextChargeAt: '2026-10-31' }
    expect(dates({ subscriptions: [sub], from: '2026-11-01', to: '2027-01-31' })).toEqual(['2026-11-30', '2026-12-31', '2027-01-31'])
  })

  it('walks forward from a charge date in the past', () => {
    expect(dates({ subscriptions: [{ ...netflix, nextChargeAt: '2026-05-10' }] })).toEqual(['2026-11-10'])
  })

  it('repeats a yearly charge once a year', () => {
    const yearly = { ...netflix, cadence: 'yearly' as const, nextChargeAt: '2026-06-01' }
    expect(dates({ subscriptions: [yearly], from: '2026-01-01', to: '2028-12-31' })).toEqual(['2026-06-01', '2027-06-01', '2028-06-01'])
  })
})

describe('incomes', () => {
  const pay = { id: 'i1', name: 'Nómina', amountCents: 1_200_000 as number | null }

  it('once: only on its date', () => {
    const once = { ...pay, frequency: 'once' as const, startsOn: '2026-11-20' }
    expect(run({ incomes: [once] })).toEqual([
      { date: '2026-11-20', kind: 'income', title: 'Nómina', amountCents: 1_200_000, sourceId: 'i1' },
    ])
    expect(dates({ incomes: [{ ...once, startsOn: '2026-12-01' }] })).toEqual([])
  })

  it('weekly and every 14 days', () => {
    expect(dates({ incomes: [{ ...pay, frequency: 'weekly', startsOn: '2026-10-28' }] })).toEqual([
      '2026-11-04', '2026-11-11', '2026-11-18', '2026-11-25',
    ])
    expect(dates({ incomes: [{ ...pay, frequency: 'biweekly', startsOn: '2026-10-30' }] })).toEqual(['2026-11-13', '2026-11-27'])
  })

  it('semimonthly: the 15th and the last day, from the start date on', () => {
    const semi = { ...pay, frequency: 'semimonthly' as const, startsOn: '2026-09-01' }
    expect(dates({ incomes: [semi], from: '2026-11-01', to: '2027-02-28' })).toEqual([
      '2026-11-15', '2026-11-30', '2026-12-15', '2026-12-31', '2027-01-15', '2027-01-31', '2027-02-15', '2027-02-28',
    ])
    expect(dates({ incomes: [{ ...semi, startsOn: '2026-11-16' }] })).toEqual(['2026-11-30'])
  })

  it('monthly: same day each month, clamped', () => {
    const monthly = { ...pay, frequency: 'monthly' as const, startsOn: '2026-01-31' }
    expect(dates({ incomes: [monthly], from: '2026-11-01', to: '2027-02-28' })).toEqual(['2026-11-30', '2026-12-31', '2027-01-31', '2027-02-28'])
  })

  it('an income without an amount still shows up', () => {
    expect(run({ incomes: [{ ...pay, amountCents: null, frequency: 'once', startsOn: '2026-11-02' }] })[0]?.amountCents).toBeNull()
  })
})

it('sorts by date, then payments before income', () => {
  const events = run({
    cards: [{ id: 'c', name: 'Visa', cutoffDay: 15, paymentDay: 5 }],
    incomes: [{ id: 'i', name: 'Nómina', amountCents: null, frequency: 'once', startsOn: '2026-11-05' }],
    subscriptions: [{ id: 's', name: 'Spotify', amountCents: 9_900, cadence: 'monthly', nextChargeAt: '2026-11-03' }],
  })
  expect(events.map((e) => e.kind)).toEqual(['subscription', 'card_payment', 'income'])
})
