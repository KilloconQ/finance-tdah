import { describe, expect, it } from 'vitest'
import {
  createHouseholdSchema,
  createSettlementSchema,
  createSharedExpenseSchema,
  splitRequestSchema,
  updateHouseholdSchema,
  updateSharedExpenseSchema,
} from './household'

const base = {
  paidByUserId: 'u1',
  amountCents: 90_000,
  description: 'Super',
  category: 'Comida',
  occurredOn: '2026-10-18',
}

describe('createHouseholdSchema', () => {
  it('trims the name and requires one', () => {
    expect(createHouseholdSchema.parse({ name: '  Casa  ' })).toEqual({ name: 'Casa' })
    expect(createHouseholdSchema.safeParse({ name: '   ' }).success).toBe(false)
  })
})

describe('splitRequestSchema', () => {
  it('accepts every mode in the shape the domain expects', () => {
    expect(splitRequestSchema.parse({ mode: 'equal', participants: ['a', 'b'] })).toEqual({
      mode: 'equal',
      participants: ['a', 'b'],
    })
    expect(splitRequestSchema.safeParse({ mode: 'shares', weights: { a: 1, b: 2 } }).success).toBe(true)
    expect(splitRequestSchema.safeParse({ mode: 'percent', basisPoints: { a: 5_000, b: 5_000 } }).success).toBe(true)
    expect(splitRequestSchema.safeParse({ mode: 'exact', amounts: { a: 100, b: 200 } }).success).toBe(true)
  })

  it('rejects an unknown mode and a mode with the wrong payload', () => {
    expect(splitRequestSchema.safeParse({ mode: 'random', participants: ['a'] }).success).toBe(false)
    expect(splitRequestSchema.safeParse({ mode: 'equal', weights: { a: 1 } }).success).toBe(false)
  })

  it('rejects an empty group', () => {
    expect(splitRequestSchema.safeParse({ mode: 'equal', participants: [] }).success).toBe(false)
    expect(splitRequestSchema.safeParse({ mode: 'exact', amounts: {} }).success).toBe(false)
  })
})

describe('createSharedExpenseSchema', () => {
  it('accepts a normal expense', () => {
    const r = createSharedExpenseSchema.parse({ ...base, split: { mode: 'equal', participants: ['u1', 'u2'] } })
    expect(r.amountCents).toBe(90_000)
  })

  it('rejects a zero, negative or fractional amount (cents are integers)', () => {
    const split = { mode: 'equal' as const, participants: ['u1'] }
    for (const amountCents of [0, -1, 10.5]) {
      expect(createSharedExpenseSchema.safeParse({ ...base, amountCents, split }).success).toBe(false)
    }
  })

  it('requires a real calendar date', () => {
    const split = { mode: 'equal' as const, participants: ['u1'] }
    expect(createSharedExpenseSchema.safeParse({ ...base, occurredOn: '18/10/2026', split }).success).toBe(false)
  })
})

describe('updateSharedExpenseSchema', () => {
  it('an empty patch stays empty (no defaults leak in)', () => {
    expect(updateSharedExpenseSchema.parse({})).toEqual({})
    expect(updateHouseholdSchema.parse({})).toEqual({})
  })

  it('changing one field does not touch the others', () => {
    expect(updateSharedExpenseSchema.parse({ description: 'Tianguis' })).toEqual({ description: 'Tianguis' })
  })
})

describe('createSettlementSchema', () => {
  const ok = { fromUserId: 'a', toUserId: 'b', amountCents: 5_000, occurredOn: '2026-10-18' }

  it('accepts a payment between two people', () => {
    expect(createSettlementSchema.safeParse(ok).success).toBe(true)
  })

  it('rejects paying yourself and a non-positive amount', () => {
    expect(createSettlementSchema.safeParse({ ...ok, toUserId: 'a' }).success).toBe(false)
    expect(createSettlementSchema.safeParse({ ...ok, amountCents: 0 }).success).toBe(false)
  })
})

describe('schema + domain together', () => {
  it('a parsed split goes straight into computeShares and sums to the expense', async () => {
    const { computeShares } = await import('../domain/split')
    const parsed = createSharedExpenseSchema.parse({
      ...base,
      amountCents: 1_000,
      split: { mode: 'equal', participants: ['u1', 'u2', 'u3'] },
    })
    const r = computeShares(parsed.amountCents, parsed.split)
    expect(r.ok && r.shares.reduce((s, x) => s + x.shareCents, 0)).toBe(1_000)
  })
})
