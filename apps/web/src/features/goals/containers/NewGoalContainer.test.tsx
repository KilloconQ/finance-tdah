import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fakeApi, json, renderWithQuery } from '@/test/fake-api'

const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }))
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navigate }))

const { NewGoalContainer } = await import('./NewGoalContainer')

beforeEach(() => navigate.mockReset())
afterEach(cleanup)

const created = { 'POST /goals': () => json({ goal: {} }, 201) }
const save = () => screen.getByRole('button', { name: 'Crear frasco' })

describe('NewGoalContainer', () => {
  it('starts from a ready-made goal that can be created as is, in cents', async () => {
    const api = fakeApi(created)
    const user = userEvent.setup()
    render(renderWithQuery(<NewGoalContainer />).tree)

    await user.click(save())

    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: '/goals', replace: true }))
    expect(api.writes()).toEqual([
      { method: 'POST', path: '/goals', body: { name: 'Nueva meta', emoji: '🌿', targetCents: 500_000 } },
    ])
  })

  it('sends what the user typed and picked', async () => {
    const api = fakeApi(created)
    const user = userEvent.setup()
    render(renderWithQuery(<NewGoalContainer />).tree)

    const target = screen.getByLabelText('¿Cuánto necesitas?')
    await user.clear(target)
    await user.type(target, '12500.50')
    const name = screen.getByLabelText('Nombre')
    await user.clear(name)
    await user.type(name, 'Viaje a Oaxaca')
    await user.click(screen.getByRole('button', { name: '✈️' }))
    await user.click(save())

    await waitFor(() => expect(api.writes()).toHaveLength(1))
    expect(api.writes()[0]!.body).toEqual({ name: 'Viaje a Oaxaca', emoji: '✈️', targetCents: 1_250_050 })
  })

  it('takes a preset amount in one tap', async () => {
    const api = fakeApi(created)
    const user = userEvent.setup()
    render(renderWithQuery(<NewGoalContainer />).tree)

    await user.click(screen.getByRole('button', { name: '$20,000.00' }))
    await user.click(save())

    await waitFor(() => expect(api.writes()).toHaveLength(1))
    expect(api.writes()[0]!.body).toMatchObject({ targetCents: 2_000_000 })
  })

  it.each(['0', 'abc', '1.2.3'])('refuses a target of %j without calling the API', async (value) => {
    const api = fakeApi(created)
    const user = userEvent.setup()
    render(renderWithQuery(<NewGoalContainer />).tree)

    const target = screen.getByLabelText('¿Cuánto necesitas?')
    await user.clear(target)
    await user.type(target, value)
    await user.click(save())

    expect(await screen.findByText('La meta debe ser mayor a $0')).toBeTruthy()
    expect(api.writes()).toEqual([])
    expect(navigate).not.toHaveBeenCalled()
  })

  it("can't be saved with an empty target", async () => {
    const api = fakeApi(created)
    const user = userEvent.setup()
    render(renderWithQuery(<NewGoalContainer />).tree)

    await user.clear(screen.getByLabelText('¿Cuánto necesitas?'))

    expect((save() as HTMLButtonElement).disabled).toBe(true)
    await user.click(save())
    expect(api.writes()).toEqual([])
  })

  it("shows the API's reason and lets the user try again", async () => {
    let attempt = 0
    const api = fakeApi({
      'POST /goals': () => (++attempt === 1 ? json({ error: 'Ya tienes un frasco con ese nombre' }, 409) : json({ goal: {} }, 201)),
    })
    const user = userEvent.setup()
    render(renderWithQuery(<NewGoalContainer />).tree)

    await user.click(save())
    expect(await screen.findByText('Ya tienes un frasco con ese nombre')).toBeTruthy()
    expect(navigate).not.toHaveBeenCalled()

    await user.click(save())
    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: '/goals', replace: true }))
    expect(api.writes()).toHaveLength(2)
  })

  it('sends a double submit once, so the goal is not created twice', async () => {
    let release: (() => void) | undefined
    const api = fakeApi({
      'POST /goals': () => new Promise<Response>((resolve) => (release = () => resolve(json({ goal: {} }, 201)))),
    })
    const { container } = render(renderWithQuery(<NewGoalContainer />).tree)

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
})
