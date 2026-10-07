import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { account, BANK, CARD, envelope, FOOD, profileRoute } from '@/test/fixtures'
import { fakeApi, json, renderWithQuery } from '@/test/fake-api'

const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }))
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navigate }))
vi.mock('@/components/TabBar', () => ({ TabBar: () => null }))

const { AccountsContainer } = await import('./AccountsContainer')

beforeEach(() => navigate.mockReset())
afterEach(cleanup)

const routes = (accounts = [account()], envelopes = [envelope()]) => ({
  ...profileRoute,
  'GET /accounts': () => json({ accounts }),
  'GET /envelopes': () => json({ envelopes }),
  'GET /goals': () => json({ goals: [] }),
})

const headline = () => screen.getByText('Tu dinero realmente disponible').nextElementSibling?.textContent
const card = (name: string) => screen.getByLabelText(`Editar ${name}`).textContent

describe('AccountsContainer', () => {
  it('takes what the envelopes hold out of the available money, and keeps debt in', async () => {
    // $10,000 in the debit account, $6,000 of it in an envelope, and a card owing $2,000.
    fakeApi(routes([account(), account({ id: CARD, name: 'Nu', type: 'credito', balanceCents: -200_000 })]))
    render(renderWithQuery(<AccountsContainer />).tree)

    // 10,000 - 2,000 owed - 6,000 locked
    await waitFor(() => expect(headline()).toContain('2,000'))
    expect(screen.getByText(/bloqueado en cajitas/).textContent).toContain('$6,000.00')
    expect(card('Débito BBVA')).toContain('$4,000.00disponible')
    expect(card('Nu')).not.toContain('disponible')
  })

  it('shows the whole balance on an account with no envelopes', async () => {
    fakeApi(routes([account()], []))
    render(renderWithQuery(<AccountsContainer />).tree)

    await waitFor(() => expect(headline()).toContain('10,000'))
    expect(screen.queryByText(/bloqueado en cajitas/)).toBeNull()
    expect(card('Débito BBVA')).toContain('$10,000.00')
  })

  it("locks no more than an account really holds, and the card shows the shortfall", async () => {
    // The envelope claims $9,000 but the account only has $4,000 (its balance was edited down);
    // an overspent envelope locks nothing.
    fakeApi(routes([account({ balanceCents: 400_000 })], [envelope({ balanceCents: 900_000 }), envelope({ id: FOOD, balanceCents: -50_000 })]))
    render(renderWithQuery(<AccountsContainer />).tree)

    // Wait for the locked line: "$0.00" also shows before anything has loaded.
    expect((await screen.findByText(/bloqueado en cajitas/)).textContent).toContain('$4,000.00')
    expect(headline()).toContain('$0.00')
    // The card keeps the over-allocation visible (in red) instead of hiding it.
    expect(card('Débito BBVA')).toContain('-$5,000.00disponible')
  })

  it('hides the amounts when the user turned balances off', async () => {
    fakeApi({
      ...routes(),
      'GET /profile': () =>
        json({
          profile: {
            userId: 'u',
            displayName: 'Gaby',
            pain: [],
            inputPreference: 'manual',
            densityMode: 'simple',
            showBalances: false,
            weeklyBudgetCents: 220_000,
            onboardingCompleted: true,
            createdAt: '2026-10-05T12:00:00.000Z',
            updatedAt: '2026-10-05T12:00:00.000Z',
          },
        }),
    })
    render(renderWithQuery(<AccountsContainer />).tree)

    await screen.findByLabelText('Editar Débito BBVA')
    await waitFor(() => expect(headline()).not.toContain('10,000'))
    expect(headline()).not.toMatch(/\d{1,3},\d{3}/)
    expect(card('Débito BBVA')).not.toMatch(/\d{1,3},\d{3}/)
  })

  it('goes to the right screen: new account, edit account, an account\'s envelopes', async () => {
    fakeApi(routes())
    const user = userEvent.setup()
    render(renderWithQuery(<AccountsContainer />).tree)

    await user.click(await screen.findByLabelText('Agregar cuenta'))
    expect(navigate).toHaveBeenLastCalledWith({ to: '/accounts/new' })
    await user.click(screen.getByLabelText('Editar Débito BBVA'))
    expect(navigate).toHaveBeenLastCalledWith({ to: '/accounts/$id', params: { id: BANK } })
    await user.click(screen.getByLabelText('Cajitas de Débito BBVA'))
    expect(navigate).toHaveBeenLastCalledWith({ to: '/accounts/$id/envelopes', params: { id: BANK } })
  })
})
