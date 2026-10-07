import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { goal, GOAL, profileRoute } from '@/test/fixtures'
import { fakeApi, json, renderWithQuery, type SentRequest } from '@/test/fake-api'

const { navigate, confetti } = vi.hoisted(() => ({ navigate: vi.fn(), confetti: vi.fn() }))
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navigate }))
vi.mock('@/components/TabBar', () => ({ TabBar: () => null }))
vi.mock('canvas-confetti', () => ({ default: confetti }))

const { GoalDetailContainer } = await import('./GoalDetailContainer')

beforeEach(() => {
  navigate.mockReset()
  confetti.mockReset()
})
afterEach(cleanup)

/** A goal that actually accumulates what is deposited, so the screen can reload it. */
function goalApi(initial = goal(), extra: Record<string, (req: SentRequest) => Response | Promise<Response>> = {}) {
  let current = initial.currentCents
  return fakeApi({
    ...profileRoute,
    [`GET /goals/${GOAL}`]: () => json({ goal: { ...initial, currentCents: current } }),
    [`POST /goals/${GOAL}/add`]: (req) => {
      current += Number(req.body?.amountCents)
      return json({ goal: { ...initial, currentCents: current } })
    },
    ...extra,
  })
}

const addButton = () => screen.getByRole('button', { name: /^Echar \$/ })

describe('GoalDetailContainer', () => {
  it('shows the goal and what is saved', async () => {
    goalApi()
    render(renderWithQuery(<GoalDetailContainer goalId={GOAL} />).tree)

    expect(await screen.findByText('✈️ Vacaciones')).toBeTruthy()
    expect(screen.getByText(/\$4,000\.00/)).toBeTruthy()
  })

  it('deposits $100 by default, in cents, and says it was saved', async () => {
    const api = goalApi()
    const user = userEvent.setup()
    render(renderWithQuery(<GoalDetailContainer goalId={GOAL} />).tree)

    await screen.findByText('✈️ Vacaciones')
    expect(addButton().textContent).toBe('Echar $100.00')
    await user.click(addButton())

    expect(await screen.findByText('✓ $100.00 guardados al frasco')).toBeTruthy()
    expect(api.writes()).toEqual([{ method: 'POST', path: `/goals/${GOAL}/add`, body: { amountCents: 10_000 } }])
    // The goal is reloaded, so the new total shows.
    await waitFor(() => expect(screen.getByText(/\$4,100\.00/)).toBeTruthy())
  })

  it('deposits the preset that was tapped', async () => {
    const api = goalApi()
    const user = userEvent.setup()
    render(renderWithQuery(<GoalDetailContainer goalId={GOAL} />).tree)

    await screen.findByText('✈️ Vacaciones')
    await user.click(screen.getByRole('button', { name: '$250.00' }))
    expect(addButton().textContent).toBe('Echar $250.00')
    await user.click(addButton())

    await waitFor(() => expect(api.writes()).toHaveLength(1))
    expect(api.writes()[0]!.body).toEqual({ amountCents: 25_000 })
  })

  it('deposits a custom amount in cents', async () => {
    const api = goalApi()
    const user = userEvent.setup()
    render(renderWithQuery(<GoalDetailContainer goalId={GOAL} />).tree)

    await screen.findByText('✈️ Vacaciones')
    await user.click(screen.getByRole('button', { name: 'Otra' }))
    await user.type(screen.getByPlaceholderText('0'), '75.5')
    expect(addButton().textContent).toBe('Echar $75.50')
    await user.click(addButton())

    await waitFor(() => expect(api.writes()).toHaveLength(1))
    expect(api.writes()[0]!.body).toEqual({ amountCents: 7_550 })
  })

  it.each(['0', 'abc', '1.2.3'])('can not deposit a custom amount of %j', async (value) => {
    const api = goalApi()
    const user = userEvent.setup()
    render(renderWithQuery(<GoalDetailContainer goalId={GOAL} />).tree)

    await screen.findByText('✈️ Vacaciones')
    await user.click(screen.getByRole('button', { name: 'Otra' }))
    await user.type(screen.getByPlaceholderText('0'), value)

    expect((addButton() as HTMLButtonElement).disabled).toBe(true)
    await user.click(addButton())
    expect(api.writes()).toEqual([])
  })

  it('leaves nothing selected after a deposit, so a second one needs an amount', async () => {
    const api = goalApi()
    const user = userEvent.setup()
    render(renderWithQuery(<GoalDetailContainer goalId={GOAL} />).tree)

    await screen.findByText('✈️ Vacaciones')
    await user.click(addButton())
    await screen.findByText(/guardados al frasco/)

    expect(addButton().textContent).toBe('Echar $0.00')
    expect((addButton() as HTMLButtonElement).disabled).toBe(true)
    await user.click(addButton())
    expect(api.writes()).toHaveLength(1)
  })

  it("doesn't claim a deposit was saved when the API refuses it", async () => {
    const api = goalApi(goal(), { [`POST /goals/${GOAL}/add`]: () => json({ error: 'Frasco no encontrado' }, 404) })
    const user = userEvent.setup()
    render(renderWithQuery(<GoalDetailContainer goalId={GOAL} />).tree)

    await screen.findByText('✈️ Vacaciones')
    await user.click(addButton())

    await waitFor(() => expect(api.writes()).toHaveLength(1))
    expect(screen.queryByText(/guardados al frasco/)).toBeNull()
    expect(screen.getByText(/\$4,000\.00/)).toBeTruthy()
    // …and the button is usable again.
    await waitFor(() => expect((addButton() as HTMLButtonElement).disabled).toBe(false))
  })

  it('sends a double tap once, so the jar is not charged twice', async () => {
    let release: (() => void) | undefined
    const api = goalApi(goal(), {
      [`POST /goals/${GOAL}/add`]: () => new Promise<Response>((resolve) => (release = () => resolve(json({ goal: goal() })))),
    })
    render(renderWithQuery(<GoalDetailContainer goalId={GOAL} />).tree)

    await screen.findByText('✈️ Vacaciones')
    // Both taps land before React re-renders the button as disabled.
    act(() => {
      fireEvent.click(addButton())
      fireEvent.click(addButton())
    })

    await waitFor(() => expect(release).toBeTypeOf('function'))
    release!()
    await screen.findByText(/guardados al frasco/)
    expect(api.writes()).toHaveLength(1)
  })

  describe('confetti', () => {
    it('fires when a deposit completes the goal', async () => {
      goalApi(goal({ currentCents: 995_000 }))
      const user = userEvent.setup()
      render(renderWithQuery(<GoalDetailContainer goalId={GOAL} />).tree)

      await screen.findByText('✈️ Vacaciones')
      expect(confetti).not.toHaveBeenCalled()
      await user.click(addButton()) // +$100 on $9,950 of $10,000

      await waitFor(() => expect(confetti).toHaveBeenCalledTimes(1))
    })

    it('does not fire for a goal that was already complete when opened', async () => {
      goalApi(goal({ currentCents: 1_000_000 }))
      render(renderWithQuery(<GoalDetailContainer goalId={GOAL} />).tree)

      await screen.findByText('✈️ Vacaciones')
      await new Promise((resolve) => setTimeout(resolve, 50))
      expect(confetti).not.toHaveBeenCalled()
    })

    it('does not fire for a deposit that leaves the goal incomplete', async () => {
      const api = goalApi()
      const user = userEvent.setup()
      render(renderWithQuery(<GoalDetailContainer goalId={GOAL} />).tree)

      await screen.findByText('✈️ Vacaciones')
      await user.click(addButton())
      await waitFor(() => expect(api.writes()).toHaveLength(1))
      await screen.findByText(/guardados al frasco/)

      expect(confetti).not.toHaveBeenCalled()
    })
  })

  describe('deleting', () => {
    it('asks first, then deletes, says so and goes back to the goals', async () => {
      const api = goalApi(goal(), { [`DELETE /goals/${GOAL}`]: () => json({ ok: true }) })
      const user = userEvent.setup()
      render(renderWithQuery(<GoalDetailContainer goalId={GOAL} />).tree)

      await user.click(await screen.findByRole('button', { name: 'Borrar frasco' }))
      expect(screen.getByText('¿Estás seguro?')).toBeTruthy()
      expect(api.writes()).toEqual([])
      await user.click(screen.getByRole('button', { name: 'Confirmar' }))

      expect(await screen.findByText('✓ Frasco borrado')).toBeTruthy()
      expect(api.writes()).toEqual([{ method: 'DELETE', path: `/goals/${GOAL}`, body: undefined }])
      await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: '/goals', replace: true }), { timeout: 3_000 })
    })

    it('can be cancelled without touching the goal', async () => {
      const api = goalApi()
      const user = userEvent.setup()
      render(renderWithQuery(<GoalDetailContainer goalId={GOAL} />).tree)

      await user.click(await screen.findByRole('button', { name: 'Borrar frasco' }))
      await user.click(screen.getByRole('button', { name: 'Cancelar' }))

      expect(screen.getByRole('button', { name: 'Borrar frasco' })).toBeTruthy()
      expect(api.writes()).toEqual([])
    })
  })

  it('goes to the edit screen and back', async () => {
    goalApi()
    const user = userEvent.setup()
    render(renderWithQuery(<GoalDetailContainer goalId={GOAL} />).tree)

    await screen.findByText('✈️ Vacaciones')
    await user.click(screen.getByLabelText('Editar'))
    expect(navigate).toHaveBeenLastCalledWith({ to: '/goals/$id/edit', params: { id: GOAL } })
    await user.click(screen.getByRole('button', { name: /atrás|volver|back/i }))
    expect(navigate).toHaveBeenLastCalledWith({ to: '..' })
  })

  it('says so when the goal does not exist, and offers the way back', async () => {
    fakeApi({ ...profileRoute, [`GET /goals/${GOAL}`]: () => json({ error: 'Frasco no encontrado' }, 404) })
    const user = userEvent.setup()
    render(renderWithQuery(<GoalDetailContainer goalId={GOAL} />).tree)

    expect(await screen.findByText('No encontramos ese frasco')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Volver a frascos' }))
    expect(navigate).toHaveBeenCalledWith({ to: '/goals' })
  })
})
