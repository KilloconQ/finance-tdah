import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ExpenseForm, type ExpenseFormAccount } from './ExpenseForm'

const ACCOUNTS: ExpenseFormAccount[] = [
  { id: 'card', name: 'Tarjeta', type: 'credito' },
  { id: 'cash', name: 'Efectivo', type: 'efectivo' },
  { id: 'bank', name: 'Débito', type: 'debito' },
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
})
