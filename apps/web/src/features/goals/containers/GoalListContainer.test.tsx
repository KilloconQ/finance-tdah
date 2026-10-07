import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { goal, GOAL_2, profileRoute } from '@/test/fixtures'
import { fakeApi, json, renderWithQuery } from '@/test/fake-api'

const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }))
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navigate }))
vi.mock('@/components/TabBar', () => ({ TabBar: () => null }))

const { GoalListContainer } = await import('./GoalListContainer')

beforeEach(() => navigate.mockReset())
afterEach(cleanup)

const routes = (goals = [goal(), goal({ id: GOAL_2, name: 'Laptop', emoji: '💻', targetCents: 3_000_000, currentCents: 150_050 })]) => ({
  ...profileRoute,
  'GET /goals': () => json({ goals }),
})

describe('GoalListContainer', () => {
  it('lists the goals with their progress and the total saved', async () => {
    fakeApi(routes())
    render(renderWithQuery(<GoalListContainer />).tree)

    expect(await screen.findByText('✈️ Vacaciones')).toBeTruthy()
    expect(screen.getByText('💻 Laptop')).toBeTruthy()
    // $4,000.00 + $1,500.50 saved across two goals
    expect(screen.getByText('$5,500.50')).toBeTruthy()
    expect(screen.getByText('guardado en 2 frascos')).toBeTruthy()
    expect(screen.getByText('40%')).toBeTruthy()
    expect(screen.getByText('5%')).toBeTruthy()
  })

  it('says "frasco" for a single goal', async () => {
    fakeApi(routes([goal()]))
    render(renderWithQuery(<GoalListContainer />).tree)
    expect(await screen.findByText('guardado en 1 frasco')).toBeTruthy()
  })

  it('invites the user to create the first goal when there are none', async () => {
    fakeApi(routes([]))
    const user = userEvent.setup()
    render(renderWithQuery(<GoalListContainer />).tree)

    expect(await screen.findByText('Aún no tienes frascos')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Crear frasco' }))
    expect(navigate).toHaveBeenCalledWith({ to: '/goals/new' })
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
    render(renderWithQuery(<GoalListContainer />).tree)

    await screen.findByText('✈️ Vacaciones')
    await waitFor(() => expect(screen.getAllByText('•••• / ••••')).toHaveLength(2))
    expect(screen.queryByText('$5,500.50')).toBeNull()
  })

  it('goes to the goal that was tapped, and to the new-goal form', async () => {
    fakeApi(routes())
    const user = userEvent.setup()
    render(renderWithQuery(<GoalListContainer />).tree)

    await user.click(await screen.findByText('💻 Laptop'))
    expect(navigate).toHaveBeenLastCalledWith({ to: '/goals/$id', params: { id: GOAL_2 } })
    await user.click(screen.getByLabelText('Nueva meta'))
    expect(navigate).toHaveBeenLastCalledWith({ to: '/goals/new' })
  })
})
