import { describe, expect, it } from 'vitest'
import { updateProfileSchema } from './profile'

describe('updateProfileSchema', () => {
  it("doesn't fill in reminder defaults on an unrelated patch", () => {
    expect(updateProfileSchema.parse({ showBalances: false })).toEqual({ showBalances: false })
  })

  it('validates the reminder fields', () => {
    expect(updateProfileSchema.parse({ dailyReminderHour: 8, timeZone: 'America/Bogota' })).toEqual({
      dailyReminderHour: 8,
      timeZone: 'America/Bogota',
    })
    expect(updateProfileSchema.safeParse({ dailyReminderHour: 24 }).success).toBe(false)
    expect(updateProfileSchema.safeParse({ timeZone: 'Mars/Olympus' }).success).toBe(false)
  })
})
