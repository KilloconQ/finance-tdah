import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ChallengeDTO, HomeSummaryDTO } from '@finance-tdah/shared/schemas'
import { GOAL, goal, NOW, profileRoute } from '@/test/fixtures'
import { fakeApi, json, renderWithQuery } from '@/test/fake-api'

const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }))
vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (opts: unknown) => ({ options: opts }),
  useNavigate: () => navigate,
}))
vi.mock('@/components/TabBar', () => ({ TabBar: () => null }))

const { Route } = await import('./index')
const Home = (Route as unknown as { options: { component: () => React.ReactElement } }).options.component

beforeEach(() => navigate.mockReset())
afterEach(cleanup)

const summary = (patch: Partial<HomeSummaryDTO> = {}): HomeSummaryDTO => ({
  todayAvailableCents: 31_500,
  weekSpentCents: 120_000,
  weekTargetCents: 220_000,
  netWorthCents: 0,
  liquidCents: 0,
  jarsCents: 0,
  debtCents: 0,
  greeting: 'Hola, Ana',
  ...patch,
})

const challenge = (patch: Partial<ChallengeDTO> = {}): ChallengeDTO => ({
  id: '77777777-7777-4777-8777-777777777777',
  userId: 'u',
  name: 'Semana sin café',
  description: 'No compres café fuera',
  days: 7,
  doneDays: 3,
  expectedSavingsCents: 0,
  lastCheckedAt: null,
  startedAt: NOW,
  completedAt: null,
  failedAt: null,
  createdAt: NOW,
  ...patch,
})

const routes = ({
  home = summary(),
  goals = [goal()],
  active = null as ChallengeDTO | null,
  profile = null as Record<string, unknown> | null,
} = {}) => ({
  ...profileRoute,
  ...(profile ? { 'GET /profile': () => json({ profile }) } : {}),
  'GET /dashboard/home': () => json({ summary: home }),
  'GET /goals': () => json({ goals }),
  'GET /challenges/active': () => json({ challenge: active }),
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

describe('Home', () => {
  it('greets the user and shows what they can spend today and how the week is going', async () => {
    fakeApi(routes())
    render(renderWithQuery(<Home />).tree)

    expect(await screen.findByText('Hola, Ana 👋')).toBeTruthy()
    expect(screen.getByText('Hoy puedes gastar')).toBeTruthy()
    expect(screen.getByText('$315.00')).toBeTruthy()
    // $2,200 target - $1,200 spent = $1,000 left
    const week = screen.getByText(/esta semana/).closest('div') as HTMLElement
    expect(within(week).getByText('$1,200.00')).toBeTruthy()
    expect(within(week).getByText('$1,000.00')).toBeTruthy()
  })

  it('never shows a negative amount left when the week went over budget', async () => {
    fakeApi(routes({ home: summary({ weekSpentCents: 250_000, weekTargetCents: 220_000 }) }))
    render(renderWithQuery(<Home />).tree)

    const week = (await screen.findByText(/esta semana/)).closest('div') as HTMLElement
    expect(within(week).getByText('$2,500.00')).toBeTruthy()
    expect(within(week).getByText('$0.00')).toBeTruthy()
  })

  it('shows the first goal as the jar with its progress', async () => {
    fakeApi(routes({ goals: [goal(), goal({ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', name: 'Laptop' })] }))
    render(renderWithQuery(<Home />).tree)

    expect(await screen.findByText('✈️ Vacaciones · frasco')).toBeTruthy()
    expect(screen.getByText('$4,000.00 / $10,000.00')).toBeTruthy()
    expect(screen.queryByText(/Laptop/)).toBeNull()
  })

  it('invites the user to create a goal when there is none', async () => {
    fakeApi(routes({ goals: [] }))
    const user = userEvent.setup()
    render(renderWithQuery(<Home />).tree)

    expect(await screen.findByText('Aún no tienes un frasco')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Crear frasco' }))
    expect(navigate).toHaveBeenCalledWith({ to: '/goals' })
  })

  it('shows the active challenge as a card that opens it', async () => {
    fakeApi(routes({ active: challenge() }))
    const user = userEvent.setup()
    render(renderWithQuery(<Home />).tree)

    const card = await screen.findByRole('button', { name: /Semana sin café/ })
    expect(within(card).getByText('Día 3 de 7')).toBeTruthy()
    // The card replaces the old "reto" mini stat.
    expect(screen.queryByText('reto')).toBeNull()
    await user.click(card)
    expect(navigate).toHaveBeenCalledWith({ to: '/challenge' })
  })

  it('invites the user to start a challenge when there is none', async () => {
    fakeApi(routes())
    const user = userEvent.setup()
    render(renderWithQuery(<Home />).tree)

    await user.click(await screen.findByRole('button', { name: /Empieza un reto/ }))
    expect(navigate).toHaveBeenCalledWith({ to: '/challenge' })
  })

  it('shows no challenge card when the challenge cannot be loaded', async () => {
    fakeApi({ ...routes(), 'GET /challenges/active': () => json({ error: 'boom' }, 500) })
    const { client, tree } = renderWithQuery(<Home />)
    render(tree)

    await waitFor(() => expect(client.getQueryState(['challenges', 'active'])?.status).toBe('error'))
    // Inviting to start one could make a user with a running challenge start another.
    expect(screen.queryByRole('button', { name: /Empieza un reto/ })).toBeNull()
  })

  it('masks every amount when the user chose to hide balances', async () => {
    fakeApi(routes({ profile: hiddenProfile }))
    render(renderWithQuery(<Home />).tree)

    await screen.findByText('Hola, Ana 👋')
    await screen.findByText('✈️ Vacaciones · frasco')
    // The profile arrives separately; amounts get masked once it does.
    await waitFor(() => expect(screen.queryAllByText(/\$\d/)).toEqual([]))
    expect(screen.getByText('•••• / ••••')).toBeTruthy()
  })

  it('does not call any write endpoint just by loading', async () => {
    const api = fakeApi(routes())
    render(renderWithQuery(<Home />).tree)
    await screen.findByText('Hola, Ana 👋')
    expect(api.writes()).toEqual([])
  })

  it('the Gasto quick action goes to /add-expense', async () => {
    fakeApi(routes())
    const user = userEvent.setup()
    render(renderWithQuery(<Home />).tree)
    await screen.findByText('Hola, Ana 👋')

    // Rendered twice: inline on desktop and docked on mobile.
    const buttons = screen.getAllByRole('button', { name: 'Gasto' })
    expect(buttons).toHaveLength(2)
    await user.click(buttons[0])
    expect(navigate).toHaveBeenCalledWith({ to: '/add-expense' })
  })

  it('puts "Echar al frasco" on the jar itself, opening that jar', async () => {
    fakeApi(routes())
    const user = userEvent.setup()
    render(renderWithQuery(<Home />).tree)

    await screen.findByText('✈️ Vacaciones · frasco')
    // One button, on the jar card: no longer docked next to "Gasto".
    const buttons = screen.getAllByRole('button', { name: 'Echar al frasco' })
    expect(buttons).toHaveLength(1)
    await user.click(buttons[0])
    expect(navigate).toHaveBeenCalledWith({ to: '/goals/$id', params: { id: GOAL } })
  })

  it('opens settings and panic mode from the app bar', async () => {
    fakeApi(routes())
    const user = userEvent.setup()
    render(renderWithQuery(<Home />).tree)

    await user.click(screen.getByRole('button', { name: 'Ajustes' }))
    expect(navigate).toHaveBeenLastCalledWith({ to: '/settings' })
    expect(screen.getByRole('button', { name: 'Modo pánico' }).className).toContain('min-h-10')
    await user.click(screen.getByRole('button', { name: 'Modo pánico' }))
    expect(navigate).toHaveBeenLastCalledWith({ to: '/panic' })
  })
})
