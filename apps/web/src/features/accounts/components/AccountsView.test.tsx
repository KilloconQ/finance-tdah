import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { EnvelopeDTO, FinancialAccountDTO } from '@finance-tdah/shared/schemas'
import { AccountsView } from './AccountsView'

vi.mock('@/components/TabBar', () => ({ TabBar: () => null }))

const NOW = '2026-09-29T12:00:00.000Z'
const account: FinancialAccountDTO = {
  id: 'acc',
  userId: 'u',
  name: 'Débito BBVA',
  type: 'debito',
  institution: null,
  last4: null,
  balanceCents: 1_000_000,
  createdAt: NOW,
  updatedAt: NOW,
}
const envelope: EnvelopeDTO = {
  id: 'e',
  userId: 'u',
  accountId: 'acc',
  name: 'Renta',
  emoji: '🏠',
  balanceCents: 600_000,
  createdAt: NOW,
  updatedAt: NOW,
}

afterEach(cleanup)

function setup(lockedCents: number, envelopes: EnvelopeDTO[]) {
  render(
    <AccountsView
      accounts={[account]}
      envelopes={envelopes}
      goalsTotalCents={0}
      lockedCents={lockedCents}
      liquidCents={1_000_000}
      debtCents={0}
      netWorthCents={1_000_000}
      showBalances
      loading={false}
      onAddAccount={() => {}}
      onEditAccount={() => {}}
      onOpenEnvelopes={() => {}}
    />,
  )
}

const headline = () => screen.getByText('Tu dinero realmente disponible').nextElementSibling?.textContent

describe('AccountsView', () => {
  it('takes what is in envelopes out of the available money and shows it as locked', () => {
    setup(600_000, [envelope])
    expect(headline()).toContain('4,000')
    expect(screen.getByText(/bloqueado en cajitas/).textContent).toContain('$6,000.00')
    // The card shows only what's free; the envelopes' total sits below it.
    expect(screen.getByLabelText('Editar Débito BBVA').textContent).toContain('$4,000.00disponible')
    expect(screen.getByLabelText('Editar Débito BBVA').textContent).not.toContain('$10,000.00')
    expect(screen.getByLabelText('Cajitas de Débito BBVA').textContent).toContain('$6,000.00 en cajitas')
  })

  it('shows the whole net worth as available without envelopes', () => {
    setup(0, [])
    expect(headline()).toContain('10,000')
    expect(screen.queryByText(/bloqueado en cajitas/)).toBeNull()
    expect(screen.getByLabelText('Editar Débito BBVA').textContent).toContain('$10,000.00')
    expect(screen.getByLabelText('Editar Débito BBVA').textContent).not.toContain('disponible')
  })
})
