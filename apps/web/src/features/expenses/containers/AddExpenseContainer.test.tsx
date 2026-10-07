import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fakeApi, json, renderWithQuery } from '@/test/fake-api'

const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }))
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navigate }))

const { AddExpenseContainer } = await import('./AddExpenseContainer')

const NOW = '2026-10-05T12:00:00.000Z'
const BANK = '11111111-1111-4111-8111-111111111111'
const RENT = '22222222-2222-4222-8222-222222222222'
const account = {
  id: BANK,
  userId: 'u',
  name: 'Débito BBVA',
  type: 'debito',
  institution: null,
  last4: null,
  balanceCents: 1_000_000,
  createdAt: NOW,
  updatedAt: NOW,
}
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

const reads = {
  'GET /accounts': () => json({ accounts: [account] }),
  'GET /envelopes': () => json({ envelopes: [envelope] }),
}

beforeEach(() => navigate.mockReset())
afterEach(cleanup)

async function fillAndSave(user: ReturnType<typeof userEvent.setup>, amount = '125.50') {
  await user.type(await screen.findByLabelText('Cuánto'), amount)
  await user.type(screen.getByLabelText('Nota'), 'Café con Lu')
  await user.click(screen.getByRole('button', { name: /Café/ }))
  await user.click(screen.getByRole('button', { name: 'Guardar gasto' }))
}

describe('AddExpenseContainer', () => {
  it('sends the expense in cents, from the chosen account, and goes home', async () => {
    const api = fakeApi({ ...reads, 'POST /expenses': () => json({ expense: {} }, 201) })
    const user = userEvent.setup()
    render(renderWithQuery(<AddExpenseContainer />).tree)

    await fillAndSave(user)

    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: '/', replace: true }))
    expect(api.writes()).toEqual([
      {
        method: 'POST',
        path: '/expenses',
        body: expect.objectContaining({
          kind: 'expense',
          amountCents: 12_550,
          category: 'café',
          description: 'Café con Lu',
          accountId: BANK,
        }),
      },
    ])
  })

  it('reloads account and envelope balances after saving, since the money moved', async () => {
    const api = fakeApi({ ...reads, 'POST /expenses': () => json({ expense: {} }, 201) })
    const user = userEvent.setup()
    render(renderWithQuery(<AddExpenseContainer />).tree)

    await fillAndSave(user)

    const gets = (path: string) => api.sent.filter((r) => r.method === 'GET' && r.path === path).length
    await waitFor(() => {
      expect(gets('/accounts')).toBe(2)
      expect(gets('/envelopes')).toBe(2)
    })
  })

  it('sends the envelope the expense was paid from', async () => {
    const api = fakeApi({ ...reads, 'POST /expenses': () => json({ expense: {} }, 201) })
    const user = userEvent.setup()
    render(renderWithQuery(<AddExpenseContainer />).tree)

    await user.selectOptions(await screen.findByLabelText('De qué cajita (opcional)'), RENT)
    await fillAndSave(user, '300')

    await waitFor(() => expect(api.writes()).toHaveLength(1))
    expect(api.writes()[0]!.body).toMatchObject({ accountId: BANK, envelopeId: RENT, amountCents: 30_000 })
  })

  it("shows the API's reason when the money is locked in envelopes, and lets the user retry", async () => {
    const locked = 'Ese dinero está bloqueado en tus cajitas: en esta cuenta solo tienes $4,000.00 disponible. Libera una cajita si lo necesitas.'
    let attempt = 0
    const api = fakeApi({
      ...reads,
      'POST /expenses': () => (++attempt === 1 ? json({ error: locked }, 422) : json({ expense: {} }, 201)),
    })
    const user = userEvent.setup()
    render(renderWithQuery(<AddExpenseContainer />).tree)

    await fillAndSave(user, '5000')
    expect(await screen.findByText(locked)).toBeTruthy()
    expect(navigate).not.toHaveBeenCalled()

    // The failed save must not leave the form stuck: a second try goes out.
    await user.clear(screen.getByLabelText('Cuánto'))
    await user.type(screen.getByLabelText('Cuánto'), '100')
    await user.click(screen.getByRole('button', { name: 'Guardar gasto' }))
    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: '/', replace: true }))
    expect(api.writes().map((w) => w.body?.amountCents)).toEqual([500_000, 10_000])
  })

  it('sends a double submit once, so the account is not charged twice', async () => {
    let release: (() => void) | undefined
    const api = fakeApi({
      ...reads,
      'POST /expenses': () => new Promise<Response>((resolve) => (release = () => resolve(json({ expense: {} }, 201)))),
    })
    const user = userEvent.setup()
    const { container } = render(renderWithQuery(<AddExpenseContainer />).tree)

    await user.type(await screen.findByLabelText('Cuánto'), '50')
    await user.type(screen.getByLabelText('Nota'), 'Taxi')
    await user.click(screen.getByRole('button', { name: /Transporte|Taxi|Uber/ }))
    // Both submits land before React re-renders the button as disabled — the
    // race the synchronous guard is for, which separate clicks never reach.
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

  it('refuses an amount that is not a number without calling the API', async () => {
    const api = fakeApi(reads)
    const user = userEvent.setup()
    render(renderWithQuery(<AddExpenseContainer />).tree)

    await fillAndSave(user, '1.2.3')

    expect(await screen.findByText('El monto no es válido')).toBeTruthy()
    expect(api.writes()).toEqual([])
  })
})
