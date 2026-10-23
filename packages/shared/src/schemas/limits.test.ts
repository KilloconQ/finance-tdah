import { describe, expect, it } from 'vitest'
import { MAX_CENTS } from './common'
import { createExpenseSchema } from './expense'
import { createFinancialAccountSchema, updateFinancialAccountSchema } from './account'
import { createGoalSchema, addToGoalSchema } from './goal'
import { createSubscriptionSchema } from './subscription'
import { updateProfileSchema } from './profile'

const over = MAX_CENTS + 1

describe('cents cap (Postgres int32)', () => {
  it('rejects amounts above the cap on every money input', () => {
    const r = createExpenseSchema.safeParse({ amountCents: over })
    expect(!r.success && r.error.issues.some((i) => i.path[0] === 'amountCents')).toBe(true)
    expect(createFinancialAccountSchema.safeParse({ name: 'x', type: 'debito', balanceCents: over }).success).toBe(false)
    expect(updateFinancialAccountSchema.safeParse({ balanceCents: -over }).success).toBe(false)
    expect(createGoalSchema.safeParse({ name: 'x', targetCents: over }).success).toBe(false)
    expect(addToGoalSchema.safeParse({ amountCents: over }).success).toBe(false)
    expect(createSubscriptionSchema.safeParse({ name: 'x', amountCents: over }).success).toBe(false)
    expect(updateProfileSchema.safeParse({ weeklyBudgetCents: over }).success).toBe(false)
  })

  it('accepts exactly the cap', () => {
    expect(addToGoalSchema.safeParse({ amountCents: MAX_CENTS }).success).toBe(true)
    expect(updateFinancialAccountSchema.safeParse({ balanceCents: MAX_CENTS }).success).toBe(true)
  })
})
