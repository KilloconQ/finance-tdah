import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ExpenseDTO } from '@finance-tdah/shared/schemas'
import { BANK, NOW, profileRoute } from '@/test/fixtures'
import { fakeApi, json, renderWithQuery } from '@/test/fake-api'

const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }))
vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (opts: unknown) => ({ options: opts }),
  useNavigate: () => navigate,
}))
vi.mock('@/components/TabBar', () => ({ TabBar: () => null }))

const { Route } = await import('./transactions')
const Transactions = (Route as unknown as { options: { component: () => React.ReactElement } }).options.component

beforeEach(() => navigate.mockReset())
afterEach(cleanup)

const E1 = 'e1111111-1111-4111-8111-111111111111'
const E2 = 'e2222222-2222-4222-8222-222222222222'
const E3 = 'e3333333-3333-4333-8333-333333333333'

const expense = (patch: Partial<ExpenseDTO> = {}): ExpenseDTO => ({
  id: E1,
  userId: 'u',
  accountId: BANK,
  toAccountId: null,
  envelopeId: null,
  kind: 'expense',
  amountCents: 4_500,
  category: 'café',
  description: 'Latte',
  occurredAt: '2026-10-05T12:00:00.000Z',
  createdAt: NOW,
  ...patch,
})

const hiddenProfile = {
  userId: 'u',
  displayName: 'Ana',
  pain: [],
  inputPreference: 'voice',
  densityMode: 'simple',
  showBalances: false,
  weeklyBudgetCents: 220_000,
  onboardingCompleted: true,
  createdAt: NOW,
  updatedAt: NOW,
}

const expensesRoute = (expenses: ExpenseDTO[]) => ({
  ...profileRoute,
  'GET /expenses': () => json({ expenses }),
})

// The row is the flex container holding the description, its category and its actions.
const row = (title: string) => screen.getByText(title).closest('div.flex.items-center') as HTMLElement
// A day group is the header plus its card; the grandparent of the header text holds both.
const dayGroup = (header: RegExp) => screen.getByText(header).parentElement?.parentElement as HTMLElement

describe('Transactions', () => {
  it('lists expenses grouped by day, each under its own date', async () => {
    fakeApi(
      expensesRoute([
        expense(),
        expense({ id: E2, description: 'Taxi', category: 'transporte', amountCents: 9_000 }),
        expense({ id: E3, description: 'Cine', category: 'ocio', occurredAt: '2026-10-03T12:00:00.000Z' }),
      ]),
    )
    render(renderWithQuery(<Transactions />).tree)

    await screen.findByText('Latte')
    // 2026-10-05 is a Monday, 2026-10-03 a Saturday.
    const monday = dayGroup(/lunes/i)
    expect(within(monday).getByText('Latte')).toBeTruthy()
    expect(within(monday).getByText('Taxi')).toBeTruthy()
    expect(within(monday).queryByText('Cine')).toBeNull()
    expect(within(dayGroup(/s[áa]bado/i)).getByText('Cine')).toBeTruthy()
  })

  it('shows expenses, income and transfers with different signs', async () => {
    fakeApi(
      expensesRoute([
        expense({ description: 'Café' }),
        expense({ id: E2, description: 'Nómina', kind: 'income', amountCents: 100_000 }),
        expense({ id: E3, description: 'Ahorro', kind: 'transfer', amountCents: 20_000, toAccountId: BANK }),
      ]),
    )
    render(renderWithQuery(<Transactions />).tree)

    await screen.findByText('Café')
    expect(within(row('Café')).getByText('−$45.00')).toBeTruthy()
    expect(within(row('Nómina')).getByText('+$1,000.00')).toBeTruthy()
    expect(within(row('Ahorro')).getByText('→ $200.00')).toBeTruthy()
  })

  it('falls back to a neutral coin for an unknown category', async () => {
    fakeApi(expensesRoute([expense({ category: 'mascotas', description: 'Croquetas' })]))
    render(renderWithQuery(<Transactions />).tree)

    await screen.findByText('Croquetas')
    expect(within(row('Croquetas')).getByText('🪙')).toBeTruthy()
    expect(within(row('Croquetas')).getByText('mascotas')).toBeTruthy()
  })

  it('masks the amounts when the user chose to hide balances', async () => {
    fakeApi({ 'GET /profile': () => json({ profile: hiddenProfile }), 'GET /expenses': () => json({ expenses: [expense()] }) })
    render(renderWithQuery(<Transactions />).tree)

    await screen.findByText('Latte')
    await waitFor(() => expect(within(row('Latte')).getByText('••••')).toBeTruthy())
    expect(screen.queryByText('−$45.00')).toBeNull()
  })

  it('shows an empty state with a way to register the first expense', async () => {
    fakeApi(expensesRoute([]))
    const user = userEvent.setup()
    render(renderWithQuery(<Transactions />).tree)

    expect(await screen.findByText('Aún no registraste nada')).toBeTruthy()
    // The app bar action and the empty-state button share the same label.
    await user.click(screen.getAllByRole('button', { name: 'Registrar gasto' }).at(-1)!)
    expect(navigate).toHaveBeenCalledWith({ to: '/add-expense' })
  })

  it('goes to add-expense from the app bar', async () => {
    fakeApi(expensesRoute([expense()]))
    const user = userEvent.setup()
    render(renderWithQuery(<Transactions />).tree)

    await screen.findByText('Latte')
    await user.click(screen.getByRole('button', { name: 'Registrar gasto' }))
    expect(navigate).toHaveBeenCalledWith({ to: '/add-expense' })
  })

  it('opens the edit screen of the chosen expense', async () => {
    fakeApi(expensesRoute([expense(), expense({ id: E2, description: 'Taxi' })]))
    const user = userEvent.setup()
    render(renderWithQuery(<Transactions />).tree)

    await screen.findByText('Taxi')
    await user.click(within(row('Taxi')).getByRole('button', { name: 'Editar gasto' }))
    expect(navigate).toHaveBeenCalledWith({ to: '/transactions/$id/edit', params: { id: E2 } })
  })

  it('asks for confirmation before deleting, and cancelling sends nothing', async () => {
    const api = fakeApi(expensesRoute([expense()]))
    const user = userEvent.setup()
    render(renderWithQuery(<Transactions />).tree)

    await screen.findByText('Latte')
    await user.click(screen.getByRole('button', { name: 'Borrar gasto' }))
    expect(screen.getByText('¿Estás seguro?')).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(screen.getByText('Latte')).toBeTruthy()
    expect(screen.queryByText('¿Estás seguro?')).toBeNull()
    expect(api.writes()).toEqual([])
  })

  it('deletes the confirmed expense, refreshes the list and says so', async () => {
    let remaining = [expense(), expense({ id: E2, description: 'Taxi' })]
    const api = fakeApi({
      ...profileRoute,
      'GET /expenses': () => json({ expenses: remaining }),
      [`DELETE /expenses/${E2}`]: () => {
        remaining = remaining.filter((e) => e.id !== E2)
        return json({ ok: true })
      },
    })
    const user = userEvent.setup()
    render(renderWithQuery(<Transactions />).tree)

    await screen.findByText('Taxi')
    await user.click(within(row('Taxi')).getByRole('button', { name: 'Borrar gasto' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(await screen.findByText('✓ Gasto borrado')).toBeTruthy()
    await waitFor(() => expect(screen.queryByText('Taxi')).toBeNull())
    expect(screen.getByText('Latte')).toBeTruthy()
    expect(api.writes().map((w) => `${w.method} ${w.path}`)).toEqual([`DELETE /expenses/${E2}`])
  })

  it('keeps the confirmation open when the delete fails', async () => {
    fakeApi({
      ...expensesRoute([expense()]),
      [`DELETE /expenses/${E1}`]: () => json({ error: 'boom' }, 500),
    })
    const user = userEvent.setup()
    render(renderWithQuery(<Transactions />).tree)

    await screen.findByText('Latte')
    await user.click(screen.getByRole('button', { name: 'Borrar gasto' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    await waitFor(() => expect(screen.getByRole('button', { name: 'Confirmar' })).toHaveProperty('disabled', false))
    expect(screen.getByText('¿Estás seguro?')).toBeTruthy()
    expect(screen.queryByText('✓ Gasto borrado')).toBeNull()
  })
})
