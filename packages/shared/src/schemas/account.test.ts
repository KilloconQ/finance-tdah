import { describe, expect, it } from 'vitest'
import { createFinancialAccountSchema, updateFinancialAccountSchema } from './account'

describe('updateFinancialAccountSchema', () => {
  it("doesn't turn a rename into a $0 balance", () => {
    expect(updateFinancialAccountSchema.parse({ name: 'Nueva' })).toEqual({ name: 'Nueva' })
    expect(updateFinancialAccountSchema.parse({})).toEqual({})
  })

  it('still takes a balance, including a negative one', () => {
    expect(updateFinancialAccountSchema.parse({ balanceCents: -5_000 })).toEqual({ balanceCents: -5_000 })
  })

  it('creating without a balance still starts at $0', () => {
    expect(createFinancialAccountSchema.parse({ name: 'Nueva', type: 'debito' }).balanceCents).toBe(0)
  })
})
