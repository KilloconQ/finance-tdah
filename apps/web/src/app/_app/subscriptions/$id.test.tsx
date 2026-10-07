import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { profileRoute, subscription, SUB } from '@/test/fixtures'
import { fakeApi, json, renderWithQuery } from '@/test/fake-api'

const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }))
vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (opts: unknown) => ({ options: opts, useParams: () => ({ id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' }) }),
  useNavigate: () => navigate,
}))
vi.mock('@/components/TabBar', () => ({ TabBar: () => null }))

const { Route } = await import('./$id')
const SubscriptionDetail = (Route as unknown as { options: { component: () => React.ReactElement } }).options.component

beforeEach(() => navigate.mockReset())
afterEach(cleanup)

const daysAgoIso = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10)

const routes = (sub = subscription(), extra: Record<string, () => Response | Promise<Response>> = {}) => ({
  ...profileRoute,
  'GET /subscriptions': () => json({ subscriptions: [sub] }),
  ...extra,
})

describe('Subscription detail', () => {
  it('shows the name and what it costs per period', async () => {
    fakeApi(routes())
    render(renderWithQuery(<SubscriptionDetail />).tree)

    expect((await screen.findAllByText('Netflix')).length).toBeGreaterThan(0)
    expect(screen.getByText('$269.00', { exact: false }).textContent).toContain('/ mes')
  })

  it('says "año" for a yearly plan', async () => {
    fakeApi(routes(subscription({ name: 'Dominio', amountCents: 120_000, cadence: 'yearly' })))
    render(renderWithQuery(<SubscriptionDetail />).tree)

    expect((await screen.findByText('$1,200.00', { exact: false })).textContent).toContain('/ año')
  })

  it('hides the price when the user turned balances off', async () => {
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
    render(renderWithQuery(<SubscriptionDetail />).tree)

    await screen.findAllByText('Netflix')
    await waitFor(() => expect(screen.getByText('••••', { exact: false })).toBeTruthy())
    expect(screen.queryByText('$269.00', { exact: false })).toBeNull()
  })

  describe('an unused subscription', () => {
    it('says how long it has not been opened and what that has cost: a monthly plan by months', async () => {
      // $300 a month, not opened for 60 days
      fakeApi(routes(subscription({ unused: true, amountCents: 30_000, lastOpenedAt: daysAgoIso(60) })))
      render(renderWithQuery(<SubscriptionDetail />).tree)

      expect(await screen.findByText('No la abres hace 60 días')).toBeTruthy()
      expect(screen.getByText(/Llevas/).textContent).toContain('$600.00')
    })

    it('prices a yearly plan by the year, not as if it were monthly', async () => {
      // $1,200 a year, not opened for 60 days: ~$197, not $2,400
      fakeApi(routes(subscription({ unused: true, amountCents: 120_000, cadence: 'yearly', lastOpenedAt: daysAgoIso(60) })))
      render(renderWithQuery(<SubscriptionDetail />).tree)

      await screen.findByText('No la abres hace 60 días')
      expect(screen.getByText(/Llevas/).textContent).toContain('$197.26')
      expect(screen.getByText(/Llevas/).textContent).not.toContain('2,400')
    })
  })

  describe('a subscription in use', () => {
    it('says when it was last used and when the next charge is', async () => {
      fakeApi(routes(subscription({ lastOpenedAt: daysAgoIso(3) })))
      render(renderWithQuery(<SubscriptionDetail />).tree)

      expect(await screen.findByText('La usaste hace 3 días.')).toBeTruthy()
      expect(screen.getByText(/Próximo cobro/)).toBeTruthy()
    })

    it('says so when there is no record of use', async () => {
      fakeApi(routes())
      render(renderWithQuery(<SubscriptionDetail />).tree)

      expect(await screen.findByText('No tenemos registro de uso aún.')).toBeTruthy()
    })
  })

  describe('cancelling', () => {
    it('cancels and goes back to the list', async () => {
      const api = fakeApi(routes(subscription(), { [`POST /subscriptions/${SUB}/cancel`]: () => json({ subscription: subscription() }) }))
      const user = userEvent.setup()
      render(renderWithQuery(<SubscriptionDetail />).tree)

      await user.click(await screen.findByRole('button', { name: 'Cancelar suscripción' }))

      await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: '/subscriptions', replace: true }))
      expect(api.writes()).toEqual([{ method: 'POST', path: `/subscriptions/${SUB}/cancel`, body: undefined }])
    })

    it('stays on the screen, and usable, when the API refuses', async () => {
      const api = fakeApi(
        routes(subscription(), { [`POST /subscriptions/${SUB}/cancel`]: () => json({ error: 'Suscripción no encontrada' }, 404) }),
      )
      const user = userEvent.setup()
      render(renderWithQuery(<SubscriptionDetail />).tree)

      await user.click(await screen.findByRole('button', { name: 'Cancelar suscripción' }))

      await waitFor(() => expect(api.writes()).toHaveLength(1))
      expect(navigate).not.toHaveBeenCalled()
      await waitFor(() => expect((screen.getByRole('button', { name: 'Cancelar suscripción' }) as HTMLButtonElement).disabled).toBe(false))
    })
  })

  it('pauses for a month without leaving the screen', async () => {
    const api = fakeApi(routes(subscription(), { [`POST /subscriptions/${SUB}/pause`]: () => json({ subscription: subscription() }) }))
    const user = userEvent.setup()
    render(renderWithQuery(<SubscriptionDetail />).tree)

    await user.click(await screen.findByRole('button', { name: 'Pausar 1 mes' }))

    await waitFor(() => expect(api.writes()).toEqual([{ method: 'POST', path: `/subscriptions/${SUB}/pause`, body: undefined }]))
    expect(navigate).not.toHaveBeenCalled()
  })

  it('"La sigo necesitando" goes back without touching anything', async () => {
    const api = fakeApi(routes())
    const user = userEvent.setup()
    render(renderWithQuery(<SubscriptionDetail />).tree)

    await user.click(await screen.findByRole('button', { name: 'La sigo necesitando' }))

    expect(navigate).toHaveBeenCalledWith({ to: '/subscriptions' })
    expect(api.writes()).toEqual([])
  })

  it('goes to the edit screen', async () => {
    fakeApi(routes())
    const user = userEvent.setup()
    render(renderWithQuery(<SubscriptionDetail />).tree)

    await screen.findAllByText('Netflix')
    await user.click(screen.getByLabelText('Editar'))
    expect(navigate).toHaveBeenCalledWith({ to: '/subscriptions/$id/edit', params: { id: SUB } })
  })

  it('says so when the subscription does not exist, and offers the way back', async () => {
    fakeApi({ ...profileRoute, 'GET /subscriptions': () => json({ subscriptions: [] }) })
    const user = userEvent.setup()
    render(renderWithQuery(<SubscriptionDetail />).tree)

    expect(await screen.findByText('No encontramos esa suscripción')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Volver a suscripciones' }))
    expect(navigate).toHaveBeenCalledWith({ to: '/subscriptions' })
  })
})
