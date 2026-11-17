import { describe, expect, it } from 'vitest'
import { chargeAlertDue, nextChargeOnOrAfter } from './subscription'

describe('chargeAlertDue', () => {
  const base = { nextChargeAt: '2026-11-20', reminderHour: 9, lastAlertedFor: null }

  it('alerts the day before the charge, once the reminder hour has come', () => {
    expect(chargeAlertDue({ ...base, today: '2026-11-19', hour: 9 })).toBe(true)
    expect(chargeAlertDue({ ...base, today: '2026-11-19', hour: 8 })).toBe(false)
  })

  it('still alerts on the charge day when the day before was missed', () => {
    expect(chargeAlertDue({ ...base, today: '2026-11-20', hour: 12 })).toBe(true)
  })

  it('stays quiet earlier than the day before and after the charge day', () => {
    expect(chargeAlertDue({ ...base, today: '2026-11-18', hour: 12 })).toBe(false)
    expect(chargeAlertDue({ ...base, today: '2026-11-21', hour: 12 })).toBe(false)
  })

  it('alerts once per charge date', () => {
    expect(chargeAlertDue({ ...base, today: '2026-11-19', hour: 12, lastAlertedFor: '2026-11-20' })).toBe(false)
    expect(chargeAlertDue({ ...base, today: '2026-11-19', hour: 12, lastAlertedFor: '2026-10-20' })).toBe(true)
  })

  it('handles the day before across a month boundary', () => {
    expect(chargeAlertDue({ ...base, nextChargeAt: '2026-12-01', today: '2026-11-30', hour: 10 })).toBe(true)
  })
})

describe('nextChargeOnOrAfter', () => {
  it('keeps a charge that has not happened yet', () => {
    expect(nextChargeOnOrAfter('2026-11-20', 'monthly', '2026-11-20')).toBe('2026-11-20')
    expect(nextChargeOnOrAfter('2026-11-20', 'monthly', '2026-11-10')).toBe('2026-11-20')
  })

  it('moves a monthly charge to the next one after it passed', () => {
    expect(nextChargeOnOrAfter('2026-11-20', 'monthly', '2026-11-21')).toBe('2026-12-20')
    expect(nextChargeOnOrAfter('2026-08-20', 'monthly', '2026-11-21')).toBe('2026-12-20')
  })

  it('moves a yearly charge a year at a time', () => {
    expect(nextChargeOnOrAfter('2025-03-05', 'yearly', '2026-11-21')).toBe('2027-03-05')
  })

  it('keeps the original day of month through short months', () => {
    expect(nextChargeOnOrAfter('2026-01-31', 'monthly', '2026-02-01')).toBe('2026-02-28')
    expect(nextChargeOnOrAfter('2026-01-31', 'monthly', '2026-03-01')).toBe('2026-03-31')
  })
})
