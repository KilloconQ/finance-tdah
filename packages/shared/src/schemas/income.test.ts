import { describe, expect, it } from 'vitest'
import { calendarQuerySchema, createIncomeSchema } from './income'

describe('createIncomeSchema', () => {
  it('takes a name, a frequency and a start date; the amount is optional', () => {
    expect(createIncomeSchema.parse({ name: ' Nómina ', frequency: 'semimonthly', startsOn: '2026-11-15' })).toEqual({
      name: 'Nómina',
      frequency: 'semimonthly',
      startsOn: '2026-11-15',
    })
  })

  it('rejects an empty name, an unknown frequency and a zero amount', () => {
    expect(createIncomeSchema.safeParse({ name: ' ', frequency: 'once', startsOn: '2026-11-15' }).success).toBe(false)
    expect(createIncomeSchema.safeParse({ name: 'x', frequency: 'daily', startsOn: '2026-11-15' }).success).toBe(false)
    expect(createIncomeSchema.safeParse({ name: 'x', frequency: 'once', startsOn: '2026-11-15', amountCents: 0 }).success).toBe(false)
  })
})

describe('calendarQuerySchema', () => {
  it('accepts a range up to 400 days and rejects the rest', () => {
    expect(calendarQuerySchema.safeParse({ from: '2026-11-01', to: '2026-11-30' }).success).toBe(true)
    expect(calendarQuerySchema.safeParse({ from: '2026-11-30', to: '2026-11-01' }).success).toBe(false)
    expect(calendarQuerySchema.safeParse({ from: '2026-01-01', to: '2028-01-01' }).success).toBe(false)
  })
})
