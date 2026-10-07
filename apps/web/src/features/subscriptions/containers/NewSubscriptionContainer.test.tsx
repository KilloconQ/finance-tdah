import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fakeApi, json, renderWithQuery } from '@/test/fake-api'

const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }))
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navigate }))

const { NewSubscriptionContainer } = await import('./NewSubscriptionContainer')

beforeEach(() => navigate.mockReset())
afterEach(cleanup)

const created = { 'POST /subscriptions': () => json({ subscription: {} }, 201) }
const save = () => screen.getByRole('button', { name: 'Agregar suscripción' })

async function fill(user: ReturnType<typeof userEvent.setup>, amount = '129.90') {
  await user.type(screen.getByLabelText('Nombre'), 'Netflix')
  await user.type(screen.getByLabelText('Categoría'), 'streaming')
  await user.type(screen.getByLabelText('Monto (en pesos)'), amount)
  fireEvent.change(screen.getByLabelText('Próximo cobro'), { target: { value: '2026-11-15' } })
}

describe('NewSubscriptionContainer', () => {
  it('sends the subscription with the price in cents, monthly by default', async () => {
    const api = fakeApi(created)
    const user = userEvent.setup()
    render(renderWithQuery(<NewSubscriptionContainer />).tree)

    await fill(user)
    await user.click(save())

    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: '/subscriptions', replace: true }))
    expect(api.writes()).toEqual([
      {
        method: 'POST',
        path: '/subscriptions',
        body: { name: 'Netflix', category: 'streaming', amountCents: 12_990, cadence: 'monthly', nextChargeAt: '2026-11-15' },
      },
    ])
  })

  it('sends a yearly plan as yearly', async () => {
    const api = fakeApi(created)
    const user = userEvent.setup()
    render(renderWithQuery(<NewSubscriptionContainer />).tree)

    await fill(user, '1200')
    await user.click(screen.getByRole('button', { name: 'Anual' }))
    await user.click(save())

    await waitFor(() => expect(api.writes()).toHaveLength(1))
    expect(api.writes()[0]!.body).toMatchObject({ amountCents: 120_000, cadence: 'yearly' })
  })

  it("can't be saved until every field is filled", async () => {
    const api = fakeApi(created)
    const user = userEvent.setup()
    render(renderWithQuery(<NewSubscriptionContainer />).tree)

    expect((save() as HTMLButtonElement).disabled).toBe(true)
    await user.type(screen.getByLabelText('Nombre'), 'Netflix')
    await user.type(screen.getByLabelText('Categoría'), 'streaming')
    await user.type(screen.getByLabelText('Monto (en pesos)'), '129')
    expect((save() as HTMLButtonElement).disabled).toBe(true) // no charge date yet
    await user.click(save())
    expect(api.writes()).toEqual([])
  })

  it('refuses an amount of zero without calling the API', async () => {
    const api = fakeApi(created)
    const user = userEvent.setup()
    render(renderWithQuery(<NewSubscriptionContainer />).tree)

    await fill(user, '0')
    await user.click(save())

    expect(await screen.findByText('El monto debe ser mayor a $0')).toBeTruthy()
    expect(api.writes()).toEqual([])
    expect(navigate).not.toHaveBeenCalled()
  })

  it("shows the API's reason and lets the user try again", async () => {
    let attempt = 0
    const api = fakeApi({
      'POST /subscriptions': () => (++attempt === 1 ? json({ error: 'No pudimos guardar' }, 500) : json({ subscription: {} }, 201)),
    })
    const user = userEvent.setup()
    render(renderWithQuery(<NewSubscriptionContainer />).tree)

    await fill(user)
    await user.click(save())
    expect(await screen.findByText('No pudimos guardar')).toBeTruthy()
    expect(navigate).not.toHaveBeenCalled()

    await user.click(save())
    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: '/subscriptions', replace: true }))
    expect(api.writes()).toHaveLength(2)
  })

  it('sends a double submit once, so it is not added twice', async () => {
    let release: (() => void) | undefined
    const api = fakeApi({
      'POST /subscriptions': () => new Promise<Response>((resolve) => (release = () => resolve(json({ subscription: {} }, 201)))),
    })
    const user = userEvent.setup()
    const { container } = render(renderWithQuery(<NewSubscriptionContainer />).tree)

    await fill(user)
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
