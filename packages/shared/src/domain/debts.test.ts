import { describe, expect, it } from 'vitest'
import { computeBalances, simplifyDebts, type SharedExpenseLike, type SettlementLike } from './debts'

const expense = (paidBy: string, shares: Record<string, number>): SharedExpenseLike => ({
  paidByUserId: paidBy,
  amountCents: Object.values(shares).reduce((s, n) => s + n, 0),
  shares: Object.entries(shares).map(([userId, shareCents]) => ({ userId, shareCents })),
})
const settlement = (from: string, to: string, amountCents: number): SettlementLike => ({
  fromUserId: from,
  toUserId: to,
  amountCents,
})
const byUser = (b: { userId: string; balanceCents: number }[]) =>
  Object.fromEntries(b.map((x) => [x.userId, x.balanceCents]))

describe('computeBalances', () => {
  it('is empty when nothing happened', () => {
    expect(computeBalances(['a', 'b'], [], [])).toEqual([
      { userId: 'a', balanceCents: 0 },
      { userId: 'b', balanceCents: 0 },
    ])
  })

  it('credits the payer with what the others owe, positive = is owed', () => {
    // a pays 900 split evenly between a, b, c
    const b = byUser(computeBalances(['a', 'b', 'c'], [expense('a', { a: 300, b: 300, c: 300 })], []))
    expect(b).toEqual({ a: 600, b: -300, c: -300 })
  })

  it('a payer who is not in the split is simply owed the whole amount', () => {
    const b = byUser(computeBalances(['a', 'b'], [expense('a', { b: 500 })], []))
    expect(b).toEqual({ a: 500, b: -500 })
  })

  it('adds several expenses together', () => {
    const b = byUser(
      computeBalances(
        ['a', 'b'],
        [expense('a', { a: 500, b: 500 }), expense('b', { a: 200, b: 200 })],
        [],
      ),
    )
    expect(b).toEqual({ a: 300, b: -300 })
  })

  it('a settlement moves the balance toward zero: the payer owes less, the receiver is owed less', () => {
    const exp = expense('a', { a: 500, b: 500 }) // b owes a 500
    const b = byUser(computeBalances(['a', 'b'], [exp], [settlement('b', 'a', 500)]))
    expect(b).toEqual({ a: 0, b: 0 })
  })

  it('a partial settlement leaves the rest outstanding', () => {
    const exp = expense('a', { a: 500, b: 500 })
    const b = byUser(computeBalances(['a', 'b'], [exp], [settlement('b', 'a', 200)]))
    expect(b).toEqual({ a: 300, b: -300 })
  })

  it('always sums to zero, so no money is created or lost', () => {
    const balances = computeBalances(
      ['a', 'b', 'c'],
      [expense('a', { a: 333, b: 333, c: 334 }), expense('c', { a: 10, b: 20, c: 30 })],
      [settlement('b', 'a', 100)],
    )
    expect(balances.reduce((s, x) => s + x.balanceCents, 0)).toBe(0)
  })

  it('returns members in a stable order', () => {
    expect(computeBalances(['c', 'a', 'b'], [], []).map((x) => x.userId)).toEqual(['a', 'b', 'c'])
  })

  it('still reports someone who left (is in an old expense) so the books keep adding up', () => {
    const b = byUser(computeBalances(['a'], [expense('a', { a: 100, ghost: 100 })], []))
    expect(b).toEqual({ a: 100, ghost: -100 })
  })
})

describe('simplifyDebts', () => {
  const settle = (balances: Record<string, number>) =>
    simplifyDebts(Object.entries(balances).map(([userId, balanceCents]) => ({ userId, balanceCents })))

  it('needs nothing when everyone is square', () => {
    expect(settle({ a: 0, b: 0 })).toEqual([])
  })

  it('one debtor pays one creditor', () => {
    expect(settle({ a: 500, b: -500 })).toEqual([{ fromUserId: 'b', toUserId: 'a', amountCents: 500 }])
  })

  it('collapses a chain: a owes b, b owes c  =>  a pays c', () => {
    // net: a -100, b 0, c +100
    expect(settle({ a: -100, b: 0, c: 100 })).toEqual([{ fromUserId: 'a', toUserId: 'c', amountCents: 100 }])
  })

  it('uses at most n-1 payments and leaves everyone at exactly zero', () => {
    const balances = { a: 700, b: -200, c: -300, d: -200, e: 0 }
    const payments = settle(balances)
    expect(payments.length).toBeLessThanOrEqual(3)
    const after: Record<string, number> = { ...balances }
    for (const p of payments) {
      after[p.fromUserId] += p.amountCents
      after[p.toUserId] -= p.amountCents
      expect(p.amountCents).toBeGreaterThan(0)
    }
    expect(Object.values(after).every((v) => v === 0)).toBe(true)
  })

  it('is deterministic regardless of input order', () => {
    const one = settle({ a: 300, b: -100, c: -200 })
    const other = settle({ c: -200, b: -100, a: 300 })
    expect(other).toEqual(one)
  })

  it('refuses balances that do not sum to zero rather than inventing a payment', () => {
    expect(() => settle({ a: 100, b: -50 })).toThrow()
  })
})
