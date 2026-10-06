import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fakeApi, json, renderWithQuery } from '@/test/fake-api'

const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }))
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navigate }))

const { EditExpenseContainer } = await import('./EditExpenseContainer')

const NOW = '2026-10-05T12:00:00.000Z'
const BANK = '11111111-1111-4111-8111-111111111111'
const CASH = '33333333-3333-4333-8333-333333333333'
const RENT = '22222222-2222-4222-8222-222222222222'
const EXPENSE = '44444444-4444-4444-8444-444444444444'
const account = (id: string, name: string, type: string) => ({
  id,
  userId: 'u',
  name,
  type,
  institution: null,
  last4: null,
  balanceCents: 1_000_000,
  createdAt: NOW,
  updatedAt: NOW,
})
const envelope = {
  id: RENT,
  userId: 'u',
  accountId: BANK,
  name: 'Renta',
  emoji: '🏠',
  balanceCents: 600_000,
  createdAt: NOW,
  updatedAt: NOW,
}
const expense = {
  id: EXPENSE,
  userId: 'u',
  accountId: BANK,
  toAccountId: null,
  envelopeId: RENT,
  kind: 'expense',
  amountCents: 12_550,
  category: 'café',
  description: 'Café con Lu',
  occurredAt: NOW,
  createdAt: NOW,
}

const reads = (expenses = [expense]) => ({
  'GET /accounts': () => json({ accounts: [account(BANK, 'Débito BBVA', 'debito'), account(CASH, 'Efectivo', 'efectivo')] }),
  'GET /envelopes': () => json({ envelopes: [envelope] }),
  'GET /expenses': () => json({ expenses }),
})

beforeEach(() => navigate.mockReset())
afterEach(cleanup)

const save = () => screen.getByRole('button', { name: 'Guardar cambios' })

describe('EditExpenseContainer', () => {
  it('opens with the expense as it was saved', async () => {
    fakeApi(reads())
    render(renderWithQuery(<EditExpenseContainer expenseId={EXPENSE} />).tree)

    expect((await screen.findByLabelText('Cuánto') as HTMLInputElement).value).toBe('125.5')
    expect((screen.getByLabelText('Nota') as HTMLInputElement).value).toBe('Café con Lu')
    expect((screen.getByLabelText('De qué cuenta') as HTMLSelectElement).value).toBe(BANK)
    expect((screen.getByLabelText('De qué cajita (opcional)') as HTMLSelectElement).value).toBe(RENT)
  })

  it('sends the new amount in cents and goes back to the movements', async () => {
    const api = fakeApi({ ...reads(), [`PATCH /expenses/${EXPENSE}`]: () => json({ expense }) })
    const user = userEvent.setup()
    render(renderWithQuery(<EditExpenseContainer expenseId={EXPENSE} />).tree)

    const amount = await screen.findByLabelText('Cuánto')
    await user.clear(amount)
    await user.type(amount, '200')
    await user.click(save())

    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: '/transactions', replace: true }))
    expect(api.writes()).toEqual([
      {
        method: 'PATCH',
        path: `/expenses/${EXPENSE}`,
        body: expect.objectContaining({ amountCents: 20_000, accountId: BANK, envelopeId: RENT, kind: 'expense' }),
      },
    ])
  })

  it('reloads account and envelope balances after saving, since the money moved', async () => {
    const api = fakeApi({ ...reads(), [`PATCH /expenses/${EXPENSE}`]: () => json({ expense }) })
    const user = userEvent.setup()
    render(renderWithQuery(<EditExpenseContainer expenseId={EXPENSE} />).tree)

    const amount = await screen.findByLabelText('Cuánto')
    await user.clear(amount)
    await user.type(amount, '200')
    await user.click(save())

    const gets = (path: string) => api.sent.filter((r) => r.method === 'GET' && r.path === path).length
    await waitFor(() => {
      expect(gets('/accounts')).toBe(2)
      expect(gets('/envelopes')).toBe(2)
    })
  })

  it('sends null to take the expense out of its envelope', async () => {
    const api = fakeApi({ ...reads(), [`PATCH /expenses/${EXPENSE}`]: () => json({ expense }) })
    const user = userEvent.setup()
    render(renderWithQuery(<EditExpenseContainer expenseId={EXPENSE} />).tree)

    await user.selectOptions(await screen.findByLabelText('De qué cajita (opcional)'), '')
    await user.click(save())

    await waitFor(() => expect(api.writes()).toHaveLength(1))
    expect(api.writes()[0]!.body?.envelopeId).toBeNull()
  })

  it("shows the API's reason when the edit would spend locked money, and lets the user retry", async () => {
    const locked = 'Ese dinero está bloqueado en tus cajitas: en esta cuenta solo tienes $30.00 disponible. Libera una cajita si lo necesitas.'
    let attempt = 0
    const api = fakeApi({
      ...reads(),
      [`PATCH /expenses/${EXPENSE}`]: () => (++attempt === 1 ? json({ error: locked }, 422) : json({ expense })),
    })
    const user = userEvent.setup()
    render(renderWithQuery(<EditExpenseContainer expenseId={EXPENSE} />).tree)

    const amount = await screen.findByLabelText('Cuánto')
    await user.clear(amount)
    await user.type(amount, '5000')
    await user.click(save())
    expect(await screen.findByText(locked)).toBeTruthy()
    expect(navigate).not.toHaveBeenCalled()

    await user.clear(amount)
    await user.type(amount, '10')
    await user.click(save())
    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: '/transactions', replace: true }))
    expect(api.writes().map((w) => w.body?.amountCents)).toEqual([500_000, 1_000])
  })

  it('sends a double submit once, so the account is not adjusted twice', async () => {
    let release: (() => void) | undefined
    const api = fakeApi({
      ...reads(),
      [`PATCH /expenses/${EXPENSE}`]: () =>
        new Promise<Response>((resolve) => (release = () => resolve(json({ expense })))),
    })
    const user = userEvent.setup()
    const { container } = render(renderWithQuery(<EditExpenseContainer expenseId={EXPENSE} />).tree)

    const amount = await screen.findByLabelText('Cuánto')
    await user.clear(amount)
    await user.type(amount, '300')
    const form = container.querySelector('form')!
    act(() => {
      fireEvent.submit(form)
      fireEvent.submit(form)
    })

    await waitFor(() => expect(release).toBeTypeOf('function'))
    release!()
    await waitFor(() => expect(navigate).toHaveBeenCalled())
    expect(api.writes()).toHaveLength(1)
  })

  it('refuses a zero amount without calling the API', async () => {
    const api = fakeApi(reads())
    const user = userEvent.setup()
    render(renderWithQuery(<EditExpenseContainer expenseId={EXPENSE} />).tree)

    const amount = await screen.findByLabelText('Cuánto')
    await user.clear(amount)
    await user.type(amount, '0')
    await user.click(save())

    expect(await screen.findByText('El monto debe ser mayor a $0')).toBeTruthy()
    expect(api.writes()).toEqual([])
  })

  it('says so when the movement no longer exists', async () => {
    fakeApi(reads([]))
    render(renderWithQuery(<EditExpenseContainer expenseId={EXPENSE} />).tree)
    expect(await screen.findByText('No encontramos ese movimiento')).toBeTruthy()
  })
})
