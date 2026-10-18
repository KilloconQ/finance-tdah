import { describe, expect, it } from 'vitest'
import { computeShares, type SplitRequest } from './split'

const A = 'a'
const B = 'b'
const C = 'c'

const ok = (amountCents: number, request: SplitRequest) => {
  const r = computeShares(amountCents, request)
  if (!r.ok) throw new Error(`expected ok, got ${r.error}`)
  return r.shares
}
const err = (amountCents: number, request: SplitRequest) => {
  const r = computeShares(amountCents, request)
  if (r.ok) throw new Error('expected an error')
  return r.error
}
const total = (shares: { shareCents: number }[]) => shares.reduce((s, x) => s + x.shareCents, 0)

describe('computeShares › equal', () => {
  it('splits evenly when it divides exactly', () => {
    expect(ok(900, { mode: 'equal', participants: [A, B, C] })).toEqual([
      { userId: A, shareCents: 300 },
      { userId: B, shareCents: 300 },
      { userId: C, shareCents: 300 },
    ])
  })

  it('hands the leftover cents out one at a time, never losing or inventing money', () => {
    const shares = ok(1_000, { mode: 'equal', participants: [A, B, C] })
    expect(total(shares)).toBe(1_000)
    expect(shares.map((s) => s.shareCents).sort()).toEqual([333, 333, 334])
  })

  it('is deterministic: the order participants are sent in does not change who gets the extra cent', () => {
    const one = ok(1_000, { mode: 'equal', participants: [A, B, C] })
    const other = ok(1_000, { mode: 'equal', participants: [C, A, B] })
    expect(other).toEqual(one)
  })

  it('always sums to the amount, for many amounts and group sizes', () => {
    for (let n = 1; n <= 9; n++) {
      const participants = Array.from({ length: n }, (_, i) => `u${i}`)
      for (const amount of [1, 2, 7, 99, 100, 101, 12_345, 999_999_99]) {
        const shares = ok(amount, { mode: 'equal', participants })
        expect(total(shares)).toBe(amount)
        const values = shares.map((s) => s.shareCents)
        expect(Math.max(...values) - Math.min(...values)).toBeLessThanOrEqual(1)
      }
    }
  })

  it('gives a single participant everything', () => {
    expect(ok(777, { mode: 'equal', participants: [A] })).toEqual([{ userId: A, shareCents: 777 }])
  })

  it('handles an amount smaller than the group (some shares are 0)', () => {
    const shares = ok(2, { mode: 'equal', participants: [A, B, C] })
    expect(total(shares)).toBe(2)
    expect(shares.filter((s) => s.shareCents === 0)).toHaveLength(1)
  })
})

describe('computeShares › shares (weights)', () => {
  it('splits proportionally to the weights', () => {
    expect(ok(1_000, { mode: 'shares', weights: { [A]: 2, [B]: 3 } })).toEqual([
      { userId: A, shareCents: 400 },
      { userId: B, shareCents: 600 },
    ])
  })

  it('still sums exactly when the weights do not divide the amount', () => {
    const shares = ok(1_001, { mode: 'shares', weights: { [A]: 1, [B]: 1, [C]: 2 } })
    expect(total(shares)).toBe(1_001)
  })

  it('rejects zero, negative or fractional weights', () => {
    expect(err(100, { mode: 'shares', weights: { [A]: 0, [B]: 1 } })).toBe('invalid_weight')
    expect(err(100, { mode: 'shares', weights: { [A]: -1, [B]: 1 } })).toBe('invalid_weight')
    expect(err(100, { mode: 'shares', weights: { [A]: 1.5, [B]: 1 } })).toBe('invalid_weight')
  })
})

describe('computeShares › percent (basis points, 10000 = 100%)', () => {
  it('splits by percentage', () => {
    expect(ok(2_000, { mode: 'percent', basisPoints: { [A]: 7_000, [B]: 3_000 } })).toEqual([
      { userId: A, shareCents: 1_400 },
      { userId: B, shareCents: 600 },
    ])
  })

  it('rounds without losing a cent: 33.33 / 33.33 / 33.34', () => {
    const shares = ok(1_000, { mode: 'percent', basisPoints: { [A]: 3_333, [B]: 3_333, [C]: 3_334 } })
    expect(total(shares)).toBe(1_000)
  })

  it('rejects percentages that do not add up to 100%, instead of fixing them silently', () => {
    expect(err(1_000, { mode: 'percent', basisPoints: { [A]: 5_000, [B]: 4_000 } })).toBe('percent_not_100')
    expect(err(1_000, { mode: 'percent', basisPoints: { [A]: 6_000, [B]: 5_000 } })).toBe('percent_not_100')
  })
})

describe('computeShares › exact', () => {
  it('keeps the amounts as given when they add up', () => {
    expect(ok(1_000, { mode: 'exact', amounts: { [A]: 250, [B]: 750 } })).toEqual([
      { userId: A, shareCents: 250 },
      { userId: B, shareCents: 750 },
    ])
  })

  it('allows someone to owe 0', () => {
    expect(total(ok(500, { mode: 'exact', amounts: { [A]: 500, [B]: 0 } }))).toBe(500)
  })

  it('rejects amounts that do not add up, in either direction', () => {
    expect(err(1_000, { mode: 'exact', amounts: { [A]: 250, [B]: 740 } })).toBe('sum_mismatch')
    expect(err(1_000, { mode: 'exact', amounts: { [A]: 250, [B]: 760 } })).toBe('sum_mismatch')
  })

  it('rejects negative or fractional amounts', () => {
    expect(err(1_000, { mode: 'exact', amounts: { [A]: -100, [B]: 1_100 } })).toBe('invalid_amount')
    expect(err(1_000, { mode: 'exact', amounts: { [A]: 500.5, [B]: 499.5 } })).toBe('invalid_amount')
  })
})

describe('computeShares › invalid input', () => {
  it('rejects a non-positive or fractional total', () => {
    expect(err(0, { mode: 'equal', participants: [A] })).toBe('invalid_total')
    expect(err(-5, { mode: 'equal', participants: [A] })).toBe('invalid_total')
    expect(err(10.5, { mode: 'equal', participants: [A] })).toBe('invalid_total')
    expect(err(Number.NaN, { mode: 'equal', participants: [A] })).toBe('invalid_total')
  })

  it('rejects an empty group', () => {
    expect(err(100, { mode: 'equal', participants: [] })).toBe('no_participants')
    expect(err(100, { mode: 'shares', weights: {} })).toBe('no_participants')
  })

  it('rejects the same person twice', () => {
    expect(err(100, { mode: 'equal', participants: [A, A] })).toBe('duplicate_participant')
  })
})
