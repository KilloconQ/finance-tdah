import { describe, expect, it } from 'vitest'
import { cardStatementSchema, financialAccountSchema } from './account'

const base = {
  id: '11111111-1111-4111-8111-111111111111',
  userId: 'u',
  name: 'Nu',
  type: 'credito',
  institution: null,
  last4: null,
  balanceCents: -100,
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
}

describe('financialAccountSchema during a deploy', () => {
  it('accepts an account from an API that does not send the statement days yet', () => {
    expect(financialAccountSchema.parse(base)).toMatchObject({ cutoffDay: null, paymentDay: null })
  })

  it('keeps the days when they are sent and rejects bad ones', () => {
    expect(financialAccountSchema.parse({ ...base, cutoffDay: 10, paymentDay: 25 })).toMatchObject({
      cutoffDay: 10,
      paymentDay: 25,
    })
    expect(financialAccountSchema.safeParse({ ...base, cutoffDay: 32, paymentDay: 25 }).success).toBe(false)
  })
})

describe('cardStatementSchema', () => {
  it('carries the local day it was calculated for', () => {
    const statement = {
      today: '2026-11-15',
      cutoffDate: '2026-11-10',
      paymentDate: '2026-11-25',
      dueCents: 1,
      openPeriodCents: 2,
      nextCutoffDate: '2026-12-10',
    }
    expect(cardStatementSchema.parse(statement).today).toBe('2026-11-15')
    expect(cardStatementSchema.safeParse({ ...statement, today: undefined }).success).toBe(false)
  })
})
