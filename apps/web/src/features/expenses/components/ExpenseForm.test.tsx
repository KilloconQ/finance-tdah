import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ExpenseForm, type ExpenseFormAccount, type ExpenseFormEnvelope } from './ExpenseForm'

const ACCOUNTS: ExpenseFormAccount[] = [
  { id: 'card', name: 'Tarjeta', type: 'credito' },
  { id: 'cash', name: 'Efectivo', type: 'efectivo' },
  { id: 'bank', name: 'Débito', type: 'debito' },
]

const ENVELOPES: ExpenseFormEnvelope[] = [
  { id: 'rent', accountId: 'bank', name: 'Renta', emoji: '🏠', balanceCents: 800_000 },
  { id: 'food', accountId: 'bank', name: 'Súper', emoji: '🛒', balanceCents: 150_000 },
  { id: 'trip', accountId: 'cash', name: 'Viaje', emoji: '✈️', balanceCents: 20_000 },
]

afterEach(cleanup)

function setup(props: Partial<Parameters<typeof ExpenseForm>[0]> = {}) {
  const onSubmit = vi.fn()
  const user = userEvent.setup()
  render(<ExpenseForm accounts={ACCOUNTS} submitting={false} error={null} onSubmit={onSubmit} {...props} />)
  const submit = () => screen.getByRole<HTMLButtonElement>('button', { name: /Guardar|Transferir|Guardando/ })
  const options = (label: string) =>
    Array.from((screen.getByLabelText(label) as HTMLSelectElement).options).map((o) => o.value)
  return { user, onSubmit, submit, options }
}

describe('ExpenseForm', () => {
  it('only enables saving an expense once amount, note and category are set', async () => {
    const { user, onSubmit, submit } = setup()
    expect(submit().disabled).toBe(true)

    await user.type(screen.getByLabelText('Cuánto'), '120.50')
    await user.type(screen.getByLabelText('Nota'), '  Súper del sábado  ')
    expect(submit().disabled).toBe(true)

    await user.click(screen.getByRole('button', { name: /Súper/ }))
    expect(submit().disabled).toBe(false)
    await user.click(submit())

    expect(onSubmit).toHaveBeenCalledWith({
      amount: '120.50',
      category: 'super',
      description: 'Súper del sábado',
      accountId: 'card',
      kind: 'expense',
      toAccountId: undefined,
    })
  })

  it('does not accept a whitespace-only note', async () => {
    const { user, submit } = setup()
    await user.type(screen.getByLabelText('Cuánto'), '10')
    await user.type(screen.getByLabelText('Nota'), '   ')
    await user.click(screen.getByRole('button', { name: /Comida/ }))
    expect(submit().disabled).toBe(true)
  })

  it('never offers a credit account for income, and falls back off one', async () => {
    const { user, onSubmit, submit, options } = setup()
    expect(options('De qué cuenta')).toContain('card')

    await user.click(screen.getByRole('button', { name: 'Ingreso' }))
    expect(options('A qué cuenta')).toEqual(['cash', 'bank'])
    expect(screen.queryByText('En qué')).toBeNull()

    await user.type(screen.getByLabelText('Cuánto'), '5000')
    await user.type(screen.getByLabelText('Nota'), 'Sueldo')
    await user.click(submit())
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'income', category: 'ingreso', accountId: 'cash' }),
    )
  })

  it("never lets a transfer's destination be its source", async () => {
    const { user, onSubmit, submit, options } = setup()
    await user.click(screen.getByRole('button', { name: 'Transferencia' }))
    await user.selectOptions(screen.getByLabelText('Desde qué cuenta'), 'cash')
    expect(options('Hacia qué cuenta')).toEqual(['card', 'bank'])

    await user.selectOptions(screen.getByLabelText('Hacia qué cuenta'), 'bank')
    // Switching the source to the chosen destination moves the destination off it.
    await user.selectOptions(screen.getByLabelText('Desde qué cuenta'), 'bank')
    expect(options('Hacia qué cuenta')).not.toContain('bank')

    await user.type(screen.getByLabelText('Cuánto'), '300')
    await user.type(screen.getByLabelText('Nota'), 'Pago tarjeta')
    await user.click(submit())
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'transfer', category: 'transferencia', accountId: 'bank', toAccountId: 'card' }),
    )
  })

  it('cannot submit a transfer with a single account', async () => {
    const { user, submit } = setup({ accounts: [ACCOUNTS[1]] })
    await user.click(screen.getByRole('button', { name: 'Transferencia' }))
    await user.type(screen.getByLabelText('Cuánto'), '300')
    await user.type(screen.getByLabelText('Nota'), 'x')
    expect(submit().disabled).toBe(true)
  })

  it('blocks a second submit while saving, and shows the error it is given', () => {
    setup({ submitting: true, error: 'Saldo insuficiente', initial: { amount: '1', description: 'x', category: 'otro' } })
    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Guardando…' }).disabled).toBe(true)
    expect(screen.getByText('Saldo insuficiente')).toBeTruthy()
  })

  describe('envelopes', () => {
    const fill = async (user: ReturnType<typeof userEvent.setup>) => {
      await user.type(screen.getByLabelText('Cuánto'), '250')
      await user.type(screen.getByLabelText('Nota'), 'Despensa')
      await user.click(screen.getByRole('button', { name: /Súper/ }))
    }

    it("only offers the selected account's envelopes, and none by default", async () => {
      const { user, onSubmit, submit, options } = setup({ envelopes: ENVELOPES })
      // Default account (card) has no envelopes: no picker at all.
      expect(screen.queryByLabelText('De qué cajita (opcional)')).toBeNull()

      await user.selectOptions(screen.getByLabelText('De qué cuenta'), 'bank')
      expect(options('De qué cajita (opcional)')).toEqual(['', 'rent', 'food'])

      await fill(user)
      await user.click(submit())
      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ accountId: 'bank', envelopeId: undefined }))
    })

    it('sends the chosen envelope', async () => {
      const { user, onSubmit, submit } = setup({ envelopes: ENVELOPES })
      await user.selectOptions(screen.getByLabelText('De qué cuenta'), 'bank')
      await user.selectOptions(screen.getByLabelText('De qué cajita (opcional)'), 'food')
      await fill(user)
      await user.click(submit())
      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ accountId: 'bank', envelopeId: 'food' }))
    })

    it("drops the envelope when the account changes to one it doesn't belong to", async () => {
      const { user, onSubmit, submit } = setup({ envelopes: ENVELOPES })
      await user.selectOptions(screen.getByLabelText('De qué cuenta'), 'bank')
      await user.selectOptions(screen.getByLabelText('De qué cajita (opcional)'), 'food')
      await user.selectOptions(screen.getByLabelText('De qué cuenta'), 'cash')
      expect(screen.getByLabelText<HTMLSelectElement>('De qué cajita (opcional)').value).toBe('')

      await fill(user)
      await user.click(submit())
      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ accountId: 'cash', envelopeId: undefined }))
    })

    it('hides envelopes for income and drops a chosen one', async () => {
      const { user, onSubmit, submit } = setup({ envelopes: ENVELOPES, initial: { accountId: 'bank', envelopeId: 'rent' } })
      expect(screen.getByLabelText<HTMLSelectElement>('De qué cajita (opcional)').value).toBe('rent')

      await user.click(screen.getByRole('button', { name: 'Ingreso' }))
      expect(screen.queryByLabelText('De qué cajita (opcional)')).toBeNull()
      await user.type(screen.getByLabelText('Cuánto'), '100')
      await user.type(screen.getByLabelText('Nota'), 'Reembolso')
      await user.click(submit())
      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ kind: 'income', envelopeId: undefined }))
    })

    it("shows what's locked in envelopes and what's free to spend, except for income", async () => {
      const accounts = ACCOUNTS.map((a) => (a.id === 'bank' ? { ...a, balanceCents: 1_000_000 } : a))
      const { user } = setup({ accounts, envelopes: ENVELOPES, initial: { accountId: 'bank' } })
      expect(screen.getByText(/bloqueado en cajitas/).textContent).toBe(
        '🔒 $9,500.00 bloqueado en cajitas · puedes gastar $500.00',
      )
      await user.click(screen.getByRole('button', { name: 'Ingreso' }))
      expect(screen.queryByText(/bloqueado en cajitas/)).toBeNull()
    })
  })
})
