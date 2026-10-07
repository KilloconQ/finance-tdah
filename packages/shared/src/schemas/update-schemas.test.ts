import { describe, expect, it } from 'vitest'
import { updateEnvelopeSchema } from './envelope'
import { updateExpenseSchema } from './expense'
import { updateFinancialAccountSchema } from './account'
import { updateGoalSchema } from './goal'
import { updateProfileSchema } from './profile'
import { updateSubscriptionSchema } from './subscription'

/**
 * Zod 4 applies `.default()` even under `.partial()`. The routes spread the parsed
 * patch straight into the UPDATE, so an update schema that inherits a default from
 * its create schema silently rewrites a field the client never sent. The web forms
 * always send everything, which hides it; any other client would hit it.
 */
const UPDATE_SCHEMAS = {
  account: updateFinancialAccountSchema,
  envelope: updateEnvelopeSchema,
  expense: updateExpenseSchema,
  goal: updateGoalSchema,
  profile: updateProfileSchema,
  subscription: updateSubscriptionSchema,
}

describe('update schemas', () => {
  it.each(Object.entries(UPDATE_SCHEMAS))('%s: an empty patch stays empty', (_name, schema) => {
    expect(schema.parse({})).toEqual({})
  })

  it("goal: renaming doesn't reset the emoji", () => {
    expect(updateGoalSchema.parse({ name: 'Playa' })).toEqual({ name: 'Playa' })
  })

  it("subscription: changing the amount doesn't turn a yearly plan monthly", () => {
    expect(updateSubscriptionSchema.parse({ amountCents: 9_900 })).toEqual({ amountCents: 9_900 })
  })

  it('what is sent is kept, including the values that match the old defaults', () => {
    expect(updateGoalSchema.parse({ emoji: '🌿' })).toEqual({ emoji: '🌿' })
    expect(updateSubscriptionSchema.parse({ cadence: 'yearly' })).toEqual({ cadence: 'yearly' })
    expect(updateSubscriptionSchema.parse({ cadence: 'monthly' })).toEqual({ cadence: 'monthly' })
  })
})
