import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { goal, GOAL } from '@/test/fixtures'
import { fakeApi, json, renderWithQuery } from '@/test/fake-api'

const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }))
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navigate }))

const { EditGoalContainer } = await import('./EditGoalContainer')

beforeEach(() => navigate.mockReset())
afterEach(cleanup)

const routes = (extra: Record<string, () => Response> = {}) => ({
  [`GET /goals/${GOAL}`]: () => json({ goal: goal() }),
  [`PATCH /goals/${GOAL}`]: () => json({ goal: goal() }),
  ...extra,
})
const save = () => screen.getByRole('button', { name: 'Guardar cambios' })
const target = () => screen.getByLabelText('¿Cuánto necesitas?') as HTMLInputElement

describe('EditGoalContainer', () => {
  it('opens with the goal as it was saved', async () => {
    fakeApi(routes())
    render(renderWithQuery(<EditGoalContainer goalId={GOAL} />).tree)

    expect(((await screen.findByLabelText('Nombre')) as HTMLInputElement).value).toBe('Vacaciones')
    expect(target().value).toBe('10000')
  })

  it('sends the new target in cents and goes back to the goal', async () => {
    const api = fakeApi(routes())
    const user = userEvent.setup()
    render(renderWithQuery(<EditGoalContainer goalId={GOAL} />).tree)

    await screen.findByLabelText('Nombre')
    await user.clear(target())
    await user.type(target(), '15000.25')
    await user.click(save())

    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: '/goals/$id', params: { id: GOAL }, replace: true }))
    expect(api.writes()).toEqual([
      { method: 'PATCH', path: `/goals/${GOAL}`, body: { name: 'Vacaciones', emoji: '✈️', targetCents: 1_500_025 } },
    ])
  })

  it('renames the goal and changes its emoji', async () => {
    const api = fakeApi(routes())
    const user = userEvent.setup()
    render(renderWithQuery(<EditGoalContainer goalId={GOAL} />).tree)

    const name = await screen.findByLabelText('Nombre')
    await user.clear(name)
    await user.type(name, 'Playa')
    await user.click(screen.getByRole('button', { name: '🌵' }))
    await user.click(save())

    await waitFor(() => expect(api.writes()).toHaveLength(1))
    expect(api.writes()[0]!.body).toMatchObject({ name: 'Playa', emoji: '🌵' })
  })

  it.each(['0', 'abc'])('refuses a target of %j without calling the API', async (value) => {
    const api = fakeApi(routes())
    const user = userEvent.setup()
    render(renderWithQuery(<EditGoalContainer goalId={GOAL} />).tree)

    await screen.findByLabelText('Nombre')
    await user.clear(target())
    await user.type(target(), value)
    await user.click(save())

    expect(await screen.findByText('La meta debe ser mayor a $0')).toBeTruthy()
    expect(api.writes()).toEqual([])
  })

  it("shows the API's reason and lets the user try again", async () => {
    let attempt = 0
    const api = fakeApi(
      routes({ [`PATCH /goals/${GOAL}`]: () => (++attempt === 1 ? json({ error: 'Frasco no encontrado' }, 404) : json({ goal: goal() })) }),
    )
    const user = userEvent.setup()
    render(renderWithQuery(<EditGoalContainer goalId={GOAL} />).tree)

    await screen.findByLabelText('Nombre')
    await user.click(save())
    expect(await screen.findByText('Frasco no encontrado')).toBeTruthy()
    expect(navigate).not.toHaveBeenCalled()

    await user.click(save())
    await waitFor(() => expect(navigate).toHaveBeenCalled())
    expect(api.writes()).toHaveLength(2)
  })

  it('sends a double submit once, so the goal is not changed twice', async () => {
    let release: (() => void) | undefined
    const api = fakeApi(
      routes({ [`PATCH /goals/${GOAL}`]: () => new Promise<Response>((resolve) => (release = () => resolve(json({ goal: goal() })))) }),
    )
    const { container } = render(renderWithQuery(<EditGoalContainer goalId={GOAL} />).tree)

    await screen.findByLabelText('Nombre')
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

  it('says so when the goal does not exist', async () => {
    fakeApi({ [`GET /goals/${GOAL}`]: () => json({ error: 'Frasco no encontrado' }, 404) })
    render(renderWithQuery(<EditGoalContainer goalId={GOAL} />).tree)
    expect(await screen.findByText('No encontramos ese frasco')).toBeTruthy()
  })
})
