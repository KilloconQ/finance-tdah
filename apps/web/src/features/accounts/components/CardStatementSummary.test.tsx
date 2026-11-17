import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CardStatementSummary } from './CardStatementSummary'

const statement = {
  today: '2026-11-15',
  cutoffDate: '2026-11-10',
  paymentDate: '2026-11-25',
  dueCents: 150_000,
  openPeriodCents: 40_000,
  nextCutoffDate: '2026-12-10',
}

describe('CardStatementSummary', () => {
  it('shows what is due on the payment date and what rolls to the next period', () => {
    render(<CardStatementSummary statement={statement} />)
    expect(screen.getByText(/Te toca pagar el/)).toBeTruthy()
    expect(screen.getByText(/1,500/)).toBeTruthy()
    expect(screen.getByText(/400/)).toBeTruthy()
  })

  it('says nothing is pending when the statement is paid', () => {
    render(<CardStatementSummary statement={{ ...statement, dueCents: 0 }} />)
    expect(screen.getByText('No tienes nada pendiente de este corte')).toBeTruthy()
  })

  it('flags a payment date that already passed with money still owed', () => {
    render(<CardStatementSummary statement={{ ...statement, today: '2026-11-30' }} />)
    expect(screen.getByText(/Debiste pagar el/)).toBeTruthy()
  })
})
