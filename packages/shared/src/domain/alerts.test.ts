import { describe, expect, it } from 'vitest'
import { dueAlerts, resolveAlertRules, type AlertInput, type AlertRule } from './alerts'

const base: AlertInput = { today: '2026-11-01', hour: 9, rules: resolveAlertRules([]), cards: [], subscriptions: [], incomes: [] }
const run = (over: Partial<AlertInput>) => dueAlerts({ ...base, ...over })
const card = { id: 'c1', name: 'Visa', cutoffDay: 15, paymentDay: 5 }
const netflix = { id: 's1', name: 'Netflix', amountCents: 19_900, cadence: 'monthly' as const, nextChargeAt: '2026-12-11' }
const payroll = { id: 'i1', name: 'Nómina', amountCents: 1_200_000, frequency: 'once' as const, startsOn: '2026-11-30' }

describe('default rules', () => {
  it('match what was asked for', () => {
    const byKind = Object.fromEntries(resolveAlertRules([]).map((r) => [r.kind, r]))
    expect(byKind.income).toMatchObject({ enabled: true, daysBefore: 0, hour: 19 })
    expect(byKind.card_cutoff).toMatchObject({ enabled: true, daysBefore: 2 })
    expect(byKind.card_payment).toMatchObject({ enabled: true, daysBefore: 4 })
    expect(byKind.subscription_monthly).toMatchObject({ enabled: true, daysBefore: 1 })
    expect(byKind.subscription_yearly).toMatchObject({ enabled: true, daysBefore: 7 })
  })

  it('a stored rule overrides only its own kind', () => {
    const rules = resolveAlertRules([{ kind: 'income', enabled: false, daysBefore: 1, hour: 8 }])
    expect(rules.find((r) => r.kind === 'income')).toEqual({ kind: 'income', enabled: false, daysBefore: 1, hour: 8 })
    expect(rules.find((r) => r.kind === 'card_payment')).toMatchObject({ daysBefore: 4 })
  })
})

describe('income', () => {
  it('goes out on the pay day from 19:00, not before', () => {
    expect(run({ incomes: [payroll], today: '2026-11-30', hour: 18 })).toEqual([])
    expect(run({ incomes: [payroll], today: '2026-11-29', hour: 23 })).toEqual([])
    expect(run({ incomes: [payroll], today: '2026-11-30', hour: 19 })).toEqual([
      { kind: 'income', sourceId: 'i1', title: 'Nómina', amountCents: 1_200_000, eventDate: '2026-11-30', daysAway: 0 },
    ])
  })
})

describe('credit cards', () => {
  it('warns about the payment 4 days before', () => {
    expect(run({ cards: [card], today: '2026-11-30' })).toEqual([]) // the payment is Dec 5
    expect(run({ cards: [card], today: '2026-12-01' })).toEqual([
      { kind: 'card_payment', sourceId: 'c1', title: 'Visa', amountCents: null, eventDate: '2026-12-05', daysAway: 4 },
    ])
  })

  it('warns about the cutoff 2 days before', () => {
    expect(run({ cards: [card], today: '2026-11-12' }).filter((a) => a.kind === 'card_cutoff')).toEqual([])
    expect(run({ cards: [card], today: '2026-11-13' }).filter((a) => a.kind === 'card_cutoff')).toEqual([
      { kind: 'card_cutoff', sourceId: 'c1', title: 'Visa', amountCents: null, eventDate: '2026-11-15', daysAway: 2 },
    ])
  })

  it('finds a cutoff in the next month', () => {
    const out = run({ cards: [card], today: '2026-12-29', rules: resolveAlertRules([{ kind: 'card_cutoff', enabled: true, daysBefore: 20, hour: 9 }]) })
    expect(out.filter((a) => a.kind === 'card_cutoff').map((a) => a.eventDate)).toEqual(['2027-01-15'])
  })

  it('ignores a card without statement days', () => {
    expect(run({ cards: [{ ...card, cutoffDay: null, paymentDay: null }], today: '2026-11-13' })).toEqual([])
  })
})

describe('subscriptions', () => {
  it('monthly: the day before', () => {
    expect(run({ subscriptions: [netflix], today: '2026-12-09' })).toEqual([])
    expect(run({ subscriptions: [netflix], today: '2026-12-10' })).toEqual([
      { kind: 'subscription_monthly', sourceId: 's1', title: 'Netflix', amountCents: 19_900, eventDate: '2026-12-11', daysAway: 1 },
    ])
  })

  it('yearly: one week before', () => {
    const icloud = { ...netflix, id: 's2', name: 'iCloud', cadence: 'yearly' as const, nextChargeAt: '2027-06-01' }
    expect(run({ subscriptions: [icloud], today: '2027-05-24' })).toEqual([])
    expect(run({ subscriptions: [icloud], today: '2027-05-25' }).map((a) => [a.kind, a.daysAway])).toEqual([['subscription_yearly', 7]])
  })
})

describe('options', () => {
  const off = (kind: AlertRule['kind']): AlertRule[] => resolveAlertRules([{ kind, enabled: false, daysBefore: 0, hour: 9 }])

  it('a disabled kind sends nothing', () => {
    expect(run({ incomes: [payroll], today: '2026-11-30', hour: 20, rules: off('income') })).toEqual([])
  })

  it('a custom number of days and hour', () => {
    const rules = resolveAlertRules([{ kind: 'income', enabled: true, daysBefore: 2, hour: 7 }])
    expect(run({ incomes: [payroll], today: '2026-11-28', hour: 6, rules })).toEqual([])
    expect(run({ incomes: [payroll], today: '2026-11-28', hour: 7, rules }).map((a) => a.daysAway)).toEqual([2])
  })

  it('an alert missed on its day is still due until the event has passed', () => {
    expect(run({ subscriptions: [netflix], today: '2026-12-11', hour: 0 }).map((a) => a.daysAway)).toEqual([0])
    expect(run({ subscriptions: [netflix], today: '2026-12-12' })).toEqual([])
  })
})
