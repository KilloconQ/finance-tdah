import { describe, expect, it } from 'vitest'
import { createFinancialAccountSchema, updateFinancialAccountSchema } from './account'
import { createEnvelopeSchema } from './envelope'
import { createExpenseSchema } from './expense'
import { createGoalSchema, updateGoalSchema } from './goal'
import { createGroupSchema, createSharedExpenseSchema } from './shared-expense'
import { createSubscriptionSchema } from './subscription'

describe('names are trimmed', () => {
  it('trims account, goal, envelope, group and expense text', () => {
    expect(createFinancialAccountSchema.parse({ name: ' Ahorros ', type: 'debito' }).name).toBe('Ahorros')
    expect(updateFinancialAccountSchema.parse({ name: ' Ahorros ' })).toEqual({ name: 'Ahorros' })
    expect(createGoalSchema.parse({ name: '  Playa ', targetCents: 100 }).name).toBe('Playa')
    expect(updateGoalSchema.parse({ name: ' Playa ' })).toEqual({ name: 'Playa' })
    expect(createEnvelopeSchema.parse({ accountId: '7b0d5d4e-2f6a-4c1e-9a3b-1d2e3f4a5b6c', name: ' Super ' }).name).toBe('Super')
    expect(createGroupSchema.parse({ name: ' Viaje ' }).name).toBe('Viaje')
    expect(createExpenseSchema.parse({ amountCents: 1, category: 'x', description: ' Café ' }).description).toBe('Café')
  })

  it('rejects whitespace-only names with a Spanish message', () => {
    const r = createFinancialAccountSchema.safeParse({ name: '   ', type: 'debito' })
    expect(!r.success && r.error.issues[0].message).toBe('Ponle un nombre')
    expect(createGoalSchema.safeParse({ name: ' ', targetCents: 100 }).success).toBe(false)
    expect(updateGoalSchema.safeParse({ name: ' ' }).success).toBe(false)
    expect(createExpenseSchema.safeParse({ amountCents: 1, category: 'x', description: '  ' }).success).toBe(false)
  })
})

describe('dates are range-checked', () => {
  const year = new Date().getFullYear()
  it('rejects absurd goal, subscription, expense and group dates', () => {
    const msg = 'Elige una fecha entre 2000 y los próximos 10 años'
    const g = createGoalSchema.safeParse({ name: 'x', targetCents: 1, deadline: '9999-12-31' })
    expect(!g.success && g.error.issues[0].message).toBe(msg)
    expect(createGoalSchema.safeParse({ name: 'x', targetCents: 1, deadline: '1999-12-31' }).success).toBe(false)
    expect(createSubscriptionSchema.safeParse({ name: 'x', category: 'y', amountCents: 1, nextChargeAt: '9999-12-31' }).success).toBe(false)
    expect(createExpenseSchema.safeParse({ amountCents: 1, category: 'x', description: 'x', occurredAt: '9999-12-31T00:00:00Z' }).success).toBe(false)
    expect(createSharedExpenseSchema.safeParse({ paidBy: 'a', description: 'x', amountCents: 1, date: '9999-12-31', participantIds: ['a'] }).success).toBe(false)
  })

  it('accepts ordinary dates', () => {
    expect(createGoalSchema.safeParse({ name: 'x', targetCents: 1, deadline: `${year + 1}-06-01` }).success).toBe(true)
    expect(createGoalSchema.safeParse({ name: 'x', targetCents: 1, deadline: '2000-01-01' }).success).toBe(true)
    expect(createExpenseSchema.safeParse({ amountCents: 1, category: 'x', description: 'x', occurredAt: new Date().toISOString() }).success).toBe(true)
  })
})
