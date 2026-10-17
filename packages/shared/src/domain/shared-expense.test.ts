import { describe, expect, it } from 'vitest'
import { computeBalances, simplifyDebts, splitEqual } from './shared-expense'

describe('splitEqual', () => {
  it('splits evenly', () => {
    expect(splitEqual(900, ['a', 'b', 'c'])).toEqual([
      { userId: 'a', shareCents: 300 },
      { userId: 'b', shareCents: 300 },
      { userId: 'c', shareCents: 300 },
    ])
  })

  it('gives remainder cents to the first members so shares sum to the amount', () => {
    const shares = splitEqual(1000, ['a', 'b', 'c'])
    expect(shares.map((s) => s.shareCents)).toEqual([334, 333, 333])
    expect(shares.reduce((n, s) => n + s.shareCents, 0)).toBe(1000)
  })

  it('rejects an empty member list', () => {
    expect(() => splitEqual(100, [])).toThrow()
  })
})

describe('computeBalances', () => {
  it('credits the payer and debits each share', () => {
    const balances = computeBalances({
      expenses: [
        {
          paidBy: 'a',
          amountCents: 900,
          splits: [
            { userId: 'a', shareCents: 300 },
            { userId: 'b', shareCents: 300 },
            { userId: 'c', shareCents: 300 },
          ],
        },
      ],
      settlements: [],
    })
    expect(balances).toEqual({ a: 600, b: -300, c: -300 })
  })

  it('applies settlements: payer of the settlement gains, receiver loses', () => {
    const balances = computeBalances({
      expenses: [
        {
          paidBy: 'a',
          amountCents: 600,
          splits: [
            { userId: 'a', shareCents: 300 },
            { userId: 'b', shareCents: 300 },
          ],
        },
      ],
      settlements: [{ fromUserId: 'b', toUserId: 'a', amountCents: 300 }],
    })
    expect(balances).toEqual({ a: 0, b: 0 })
  })
})

describe('simplifyDebts', () => {
  it('returns who owes whom with the fewest transfers', () => {
    expect(simplifyDebts({ a: 600, b: -300, c: -300 })).toEqual([
      { from: 'b', to: 'a', amountCents: 300 },
      { from: 'c', to: 'a', amountCents: 300 },
    ])
  })

  it('returns nothing when everyone is settled', () => {
    expect(simplifyDebts({ a: 0, b: 0 })).toEqual([])
  })

  it('chains through a middle member instead of duplicating debts', () => {
    expect(simplifyDebts({ a: 500, b: 0, c: -500 })).toEqual([
      { from: 'c', to: 'a', amountCents: 500 },
    ])
  })
})
