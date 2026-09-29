import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { EnvelopeDTO, FinancialAccountDTO } from '@finance-tdah/shared/schemas'
import { EnvelopesView } from './EnvelopesView'

const NOW = '2026-09-28T12:00:00.000Z'
const account = (patch: Partial<FinancialAccountDTO> = {}): FinancialAccountDTO => ({
  id: 'acc',
  userId: 'u',
  name: 'Débito BBVA',
  type: 'debito',
  institution: null,
  last4: null,
  balanceCents: 1_000_000,
  createdAt: NOW,
  updatedAt: NOW,
  ...patch,
})
const envelope = (patch: Partial<EnvelopeDTO>): EnvelopeDTO => ({
  id: 'e',
  userId: 'u',
  accountId: 'acc',
  name: 'Renta',
  emoji: '🏠',
  balanceCents: 0,
  createdAt: NOW,
  updatedAt: NOW,
  ...patch,
})

afterEach(cleanup)

function setup(props: { account?: FinancialAccountDTO; envelopes?: EnvelopeDTO[] } = {}) {
  const handlers = {
    onCreate: vi.fn().mockResolvedValue({}),
    onAdjust: vi.fn().mockResolvedValue({}),
    onRename: vi.fn().mockResolvedValue({}),
    onDelete: vi.fn().mockResolvedValue({}),
  }
  render(
    <EnvelopesView
      account={props.account ?? account()}
      envelopes={props.envelopes ?? []}
      showBalances
      onBack={() => {}}
      {...handlers}
    />,
  )
  return { user: userEvent.setup(), ...handlers }
}

const stat = (label: string) => screen.getByText(label).nextElementSibling?.textContent
const card = (name: string) => screen.getByText(name).closest('.rounded-2xl') as HTMLElement

describe('EnvelopesView', () => {
  it("shows what the account holds, what's set aside and what's left", () => {
    setup({ envelopes: [envelope({ id: 'a', balanceCents: 600_000 }), envelope({ id: 'b', name: 'Súper', balanceCents: -50_000 })] })
    expect(stat('En la cuenta')).toBe('$10,000.00')
    // An overspent envelope doesn't free money.
    expect(stat('Bloqueado')).toBe('$6,000.00')
    expect(stat('Disponible')).toBe('$4,000.00')
    expect(screen.getByText(/te pasaste por \$500.00/)).toBeTruthy()
  })

  it('warns when the account holds less than what is set aside', () => {
    setup({ account: account({ balanceCents: 500_000 }), envelopes: [envelope({ balanceCents: 600_000 })] })
    expect(screen.getByText(/Apartaste más de lo que tiene la cuenta. Libera \$1,000.00/)).toBeTruthy()
  })

  it('creates an envelope within what is unassigned', async () => {
    const { user, onCreate } = setup({ envelopes: [envelope({ balanceCents: 600_000 })] })
    await user.click(screen.getByRole('button', { name: /Nueva cajita/ }))
    const form = within(screen.getByRole('form', { name: 'Nueva cajita' }))
    await user.type(form.getByLabelText('Para qué es'), 'Súper')
    await user.click(form.getByRole('button', { name: '🛒' }))

    await user.type(form.getByLabelText('Cuánto apartar (opcional)'), '4000.01')
    expect(form.getByText('Solo quedan $4,000.00 sin apartar.')).toBeTruthy()
    expect(form.getByRole<HTMLButtonElement>('button', { name: 'Crear cajita' }).disabled).toBe(true)

    await user.clear(form.getByLabelText('Cuánto apartar (opcional)'))
    await user.type(form.getByLabelText('Cuánto apartar (opcional)'), '4000')
    await user.click(form.getByRole('button', { name: 'Crear cajita' }))
    expect(onCreate).toHaveBeenCalledWith({ name: 'Súper', emoji: '🛒', amountCents: 400_000 })
  })

  it('sets money aside and releases it within the limits', async () => {
    const { user, onAdjust } = setup({ envelopes: [envelope({ id: 'rent', balanceCents: 300_000 })] })

    await user.click(within(card('Renta')).getByRole('button', { name: 'Apartar' }))
    await user.type(screen.getByLabelText('Cuánto apartar'), '7000.01')
    expect(screen.getByText('Solo quedan $7,000.00 sin apartar.')).toBeTruthy()
    await user.clear(screen.getByLabelText('Cuánto apartar'))
    await user.type(screen.getByLabelText('Cuánto apartar'), '500')
    await user.click(within(card('Renta')).getByRole('button', { name: 'Apartar' }))
    expect(onAdjust).toHaveBeenLastCalledWith({ id: 'rent', deltaCents: 50_000 })

    await user.click(await within(card('Renta')).findByRole('button', { name: 'Liberar' }))
    await user.type(screen.getByLabelText('Cuánto liberar'), '3000.01')
    expect(screen.getByText('La cajita solo tiene $3,000.00.')).toBeTruthy()
    await user.clear(screen.getByLabelText('Cuánto liberar'))
    await user.type(screen.getByLabelText('Cuánto liberar'), '1000')
    await user.click(within(card('Renta')).getByRole('button', { name: 'Liberar' }))
    expect(onAdjust).toHaveBeenLastCalledWith({ id: 'rent', deltaCents: -100_000 })
  })

  it("can't release from an empty or overspent envelope", () => {
    setup({ envelopes: [envelope({ balanceCents: 0 }), envelope({ id: 'x', name: 'Súper', balanceCents: -100 })] })
    expect(within(card('Renta')).getByRole<HTMLButtonElement>('button', { name: 'Liberar' }).disabled).toBe(true)
    expect(within(card('Súper')).getByRole<HTMLButtonElement>('button', { name: 'Liberar' }).disabled).toBe(true)
  })

  it("shows the API's error and keeps the form open", async () => {
    const { user, onAdjust } = setup({ envelopes: [envelope({ id: 'rent', balanceCents: 0 })] })
    onAdjust.mockRejectedValueOnce(new Error('No te alcanza: ya apartaste todo lo que tiene esta cuenta.'))
    await user.click(within(card('Renta')).getByRole('button', { name: 'Apartar' }))
    await user.type(screen.getByLabelText('Cuánto apartar'), '100')
    await user.click(within(card('Renta')).getByRole('button', { name: 'Apartar' }))
    expect(await screen.findByText(/No te alcanza/)).toBeTruthy()
    expect(screen.getByLabelText('Cuánto apartar')).toBeTruthy()
  })

  it('asks before deleting, and deletes', async () => {
    const { user, onDelete } = setup({ envelopes: [envelope({ id: 'rent' })] })
    await user.click(screen.getByRole('button', { name: 'Borrar Renta' }))
    expect(screen.getByText(/vuelve a quedar sin apartar/)).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Sí, borrar' }))
    expect(onDelete).toHaveBeenCalledWith('rent')
  })

  it('renames an envelope', async () => {
    const { user, onRename } = setup({ envelopes: [envelope({ id: 'rent' })] })
    await user.click(screen.getByRole('button', { name: 'Renombrar Renta' }))
    const input = screen.getByLabelText('Nombre')
    await user.clear(input)
    await user.type(input, 'Depa')
    await user.click(screen.getByRole('button', { name: '🏠' }))
    await user.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(onRename).toHaveBeenCalledWith({ id: 'rent', name: 'Depa', emoji: '🏠' })
  })

  it('has nothing to set aside on a credit card', () => {
    setup({ account: account({ type: 'credito', balanceCents: -50_000 }) })
    expect(screen.getByText('Las tarjetas de crédito no llevan cajitas')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Nueva cajita/ })).toBeNull()
  })
})
