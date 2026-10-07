import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { profileRoute, subscription, SUB, SUB_2 } from '@/test/fixtures'
import { fakeApi, json, renderWithQuery } from '@/test/fake-api'

const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }))
vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (opts: unknown) => ({ options: opts }),
  useNavigate: () => navigate,
}))
vi.mock('@/components/TabBar', () => ({ TabBar: () => null }))

const { Route } = await import('./index')
const Subscriptions = (Route as unknown as { options: { component: () => React.ReactElement } }).options.component

beforeEach(() => navigate.mockReset())
afterEach(cleanup)

const routes = (subscriptions = [subscription()]) => ({
  ...profileRoute,
  'GET /subscriptions': () => json({ subscriptions }),
})

const unusedSection = () => screen.getByText('Estás perdiendo al mes').closest('section') as HTMLElement

describe('Subscriptions list', () => {
  it('splits what is in use from what is not, with a count for each', async () => {
    fakeApi(routes([subscription(), subscription({ id: SUB_2, name: 'Audible', category: 'audiolibros', unused: true, amountCents: 16_900 })]))
    render(renderWithQuery(<Subscriptions />).tree)

    expect(await screen.findByText('Activas · 1')).toBeTruthy()
    expect(screen.getByText('1 que no usas')).toBeTruthy()
    expect(screen.getByText('Netflix')).toBeTruthy()
    expect(screen.getByText('Audible')).toBeTruthy()
  })

  it('adds up what the unused ones cost per month and per year', async () => {
    fakeApi(
      routes([
        subscription({ id: SUB, name: 'Apple TV+', unused: true, amountCents: 12_900 }),
        subscription({ id: SUB_2, name: 'Audible', unused: true, amountCents: 16_900 }),
      ]),
    )
    render(renderWithQuery(<Subscriptions />).tree)

    await screen.findByText('Estás perdiendo al mes')
    // $129 + $169 = $298 a month, $3,576 a year
    expect(within(unusedSection()).getByText('$298.00')).toBeTruthy()
    expect(within(unusedSection()).getByText('$3,576.00')).toBeTruthy()
  })

  it('counts a yearly subscription as a twelfth of its price per month, not the full price', async () => {
    // $1,200 a year is $100 a month and $1,200 a year — not $1,200 a month and $14,400 a year.
    fakeApi(
      routes([
        subscription({ id: SUB, name: 'Dominio', unused: true, amountCents: 120_000, cadence: 'yearly' }),
        subscription({ id: SUB_2, name: 'Audible', unused: true, amountCents: 16_900 }),
      ]),
    )
    render(renderWithQuery(<Subscriptions />).tree)

    await screen.findByText('Estás perdiendo al mes')
    // $100 + $169 a month; $1,200 + $2,028 a year
    expect(within(unusedSection()).getByText('$269.00')).toBeTruthy()
    expect(within(unusedSection()).getByText('$3,228.00')).toBeTruthy()
  })

  it('shows no loss section when everything is in use', async () => {
    fakeApi(routes())
    render(renderWithQuery(<Subscriptions />).tree)

    await screen.findByText('Activas · 1')
    expect(screen.queryByText('Estás perdiendo al mes')).toBeNull()
  })

  it('invites the user to add the first one when there are none', async () => {
    fakeApi(routes([]))
    const user = userEvent.setup()
    render(renderWithQuery(<Subscriptions />).tree)

    expect(await screen.findByText('Aún no sigues ninguna suscripción')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Agregar suscripción' }))
    expect(navigate).toHaveBeenCalledWith({ to: '/subscriptions/new' })
  })

  it('hides the amounts when the user turned balances off', async () => {
    fakeApi({
      ...routes([subscription({ unused: true })]),
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
    render(renderWithQuery(<Subscriptions />).tree)

    await screen.findByText('Estás perdiendo al mes')
    await waitFor(() => expect(unusedSection().textContent).toContain('••••'))
    expect(unusedSection().textContent).not.toMatch(/\d{1,3},\d{3}|\$\d/)
  })

  it('opens a subscription from either list, and the new-subscription form', async () => {
    fakeApi(routes([subscription(), subscription({ id: SUB_2, name: 'Audible', unused: true })]))
    const user = userEvent.setup()
    render(renderWithQuery(<Subscriptions />).tree)

    await user.click(await screen.findByText('Netflix'))
    expect(navigate).toHaveBeenLastCalledWith({ to: '/subscriptions/$id', params: { id: SUB } })
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(navigate).toHaveBeenLastCalledWith({ to: '/subscriptions/$id', params: { id: SUB_2 } })
    await user.click(screen.getByLabelText('Nueva suscripción'))
    expect(navigate).toHaveBeenLastCalledWith({ to: '/subscriptions/new' })
  })
})
