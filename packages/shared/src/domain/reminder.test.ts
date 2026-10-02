import { describe, expect, it } from 'vitest'
import { dailyReminderDue, isValidTimeZone, localClock } from './reminder'

describe('localClock', () => {
  it("uses the user's time zone for the date and hour", () => {
    // 03:30 UTC on Oct 3 is still 21:30 on Oct 2 in Mexico City (UTC-6).
    const now = new Date('2026-10-03T03:30:00Z')
    expect(localClock(now, 'America/Mexico_City')).toEqual({ date: '2026-10-02', hour: 21 })
    expect(localClock(now, 'UTC')).toEqual({ date: '2026-10-03', hour: 3 })
  })

  it('reports midnight as hour 0', () => {
    expect(localClock(new Date('2026-10-02T06:00:00Z'), 'America/Mexico_City')).toEqual({ date: '2026-10-02', hour: 0 })
  })
})

describe('dailyReminderDue', () => {
  const clock = (hour: number, date = '2026-10-02') => ({ date, hour })

  it('waits for the chosen hour', () => {
    expect(dailyReminderDue(clock(20), 21, null)).toBe(false)
    expect(dailyReminderDue(clock(21), 21, null)).toBe(true)
    expect(dailyReminderDue(clock(23), 21, null)).toBe(true)
  })

  it('goes out once a day', () => {
    expect(dailyReminderDue(clock(22), 21, '2026-10-02')).toBe(false)
    expect(dailyReminderDue(clock(21, '2026-10-03'), 21, '2026-10-02')).toBe(true)
  })
})

describe('isValidTimeZone', () => {
  it('accepts IANA zones and rejects junk', () => {
    expect(isValidTimeZone('America/Mexico_City')).toBe(true)
    expect(isValidTimeZone('Mars/Olympus')).toBe(false)
  })
})
