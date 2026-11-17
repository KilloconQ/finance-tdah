import { describe, expect, it } from 'vitest'
import { parseStatementDays } from './statement-days'

describe('parseStatementDays', () => {
  it('reads both days of a credit card', () => {
    expect(parseStatementDays('credito', '10', '25')).toEqual({ ok: true, cutoffDay: 10, paymentDay: 25 })
  })

  it('leaves both empty when the card has none, and ignores them on other types', () => {
    expect(parseStatementDays('credito', '', '')).toEqual({ ok: true, cutoffDay: null, paymentDay: null })
    expect(parseStatementDays('debito', '10', '25')).toEqual({ ok: true, cutoffDay: null, paymentDay: null })
  })

  it('asks for both days when only one is given', () => {
    expect(parseStatementDays('credito', '10', '')).toMatchObject({ ok: false })
    expect(parseStatementDays('credito', '', '25')).toMatchObject({ ok: false })
  })

  it('rejects days outside 1-31', () => {
    expect(parseStatementDays('credito', '0', '25')).toEqual({ ok: false, error: 'Los días van del 1 al 31' })
    expect(parseStatementDays('credito', '10', '32')).toEqual({ ok: false, error: 'Los días van del 1 al 31' })
  })
})
