import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { subscription, SUB } from '@/test/fixtures'
import { fakeApi, json, renderWithQuery } from '@/test/fake-api'

const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }))
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navigate }))

const { EditSubscriptionContainer } = await import('./EditSubscriptionContainer')

beforeEach(() => navigate.mockReset())
afterEach(cleanup)

const routes = (subs = [subscription()], extra: Record<string, () => Response | Promise<Response>> = {}) => ({
  'GET /subscriptions': () => json({ subscriptions: subs }),
  [`PATCH /subscriptions/${SUB}`]: () => json({ subscription: subscription() }),
  ...extra,
})
const save = () => screen.getByRole('button', { name: 'Guardar cambios' })
const amount = () => screen.getByLabelText('Monto (en pesos)') as HTMLInputElement

describe('EditSubscriptionContainer', () => {
  it('opens with the subscription as it was saved', async () => {
    fakeApi(routes())
    render(renderWithQuery(<EditSubscriptionContainer subscriptionId={SUB} />).tree)

    expect(((await screen.findByLabelText('Nombre')) as HTMLInputElement).value).toBe('Netflix')
    expect((screen.getByLabelText('Categoría') as HTMLInputElement).value).toBe('streaming')
    expect(amount().value).toBe('269')
    expect((screen.getByLabelText('Próximo cobro') as HTMLInputElement).value).toBe('2026-11-01')
  })

  it('sends the new price in cents and goes back to the subscription', async () => {
    const api = fakeApi(routes())
    const user = userEvent.setup()
    render(renderWithQuery(<EditSubscriptionContainer subscriptionId={SUB} />).tree)

    await screen.findByLabelText('Nombre')
    await user.clear(amount())
    await user.type(amount(), '299.50')
    await user.click(save())

    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: '/subscriptions/$id', params: { id: SUB }, replace: true }))
    expect(api.writes()).toEqual([
      {
        method: 'PATCH',
        path: `/subscriptions/${SUB}`,
        body: { name: 'Netflix', category: 'streaming', amountCents: 29_950, cadence: 'monthly', nextChargeAt: '2026-11-01' },
      },
    ])
  })

  it('keeps a yearly plan yearly when only something else changes', async () => {
    const api = fakeApi(routes([subscription({ name: 'Dominio', cadence: 'yearly', amountCents: 120_000 })]))
    const user = userEvent.setup()
    render(renderWithQuery(<EditSubscriptionContainer subscriptionId={SUB} />).tree)

    const name = await screen.findByLabelText('Nombre')
    await user.clear(name)
    await user.type(name, 'Dominio .com')
    await user.click(save())

    await waitFor(() => expect(api.writes()).toHaveLength(1))
    expect(api.writes()[0]!.body).toMatchObject({ name: 'Dominio .com', cadence: 'yearly', amountCents: 120_000 })
  })

  it('switches the billing period', async () => {
    const api = fakeApi(routes())
    const user = userEvent.setup()
    render(renderWithQuery(<EditSubscriptionContainer subscriptionId={SUB} />).tree)

    await screen.findByLabelText('Nombre')
    await user.click(screen.getByRole('button', { name: 'Anual' }))
    await user.click(save())

    await waitFor(() => expect(api.writes()).toHaveLength(1))
    expect(api.writes()[0]!.body).toMatchObject({ cadence: 'yearly' })
  })

  it('moves the next charge date', async () => {
    const api = fakeApi(routes())
    const user = userEvent.setup()
    render(renderWithQuery(<EditSubscriptionContainer subscriptionId={SUB} />).tree)

    await screen.findByLabelText('Nombre')
    fireEvent.change(screen.getByLabelText('Próximo cobro'), { target: { value: '2026-12-20' } })
    await user.click(save())

    await waitFor(() => expect(api.writes()).toHaveLength(1))
    expect(api.writes()[0]!.body).toMatchObject({ nextChargeAt: '2026-12-20' })
  })

  it('refuses an amount of zero without calling the API', async () => {
    const api = fakeApi(routes())
    const user = userEvent.setup()
    render(renderWithQuery(<EditSubscriptionContainer subscriptionId={SUB} />).tree)

    await screen.findByLabelText('Nombre')
    await user.clear(amount())
    await user.type(amount(), '0')
    await user.click(save())

    expect(await screen.findByText('El monto debe ser mayor a $0')).toBeTruthy()
    expect(api.writes()).toEqual([])
  })

  it("shows the API's reason and lets the user try again", async () => {
    let attempt = 0
    const api = fakeApi(
      routes([subscription()], {
        [`PATCH /subscriptions/${SUB}`]: () =>
          ++attempt === 1 ? json({ error: 'Suscripción no encontrada' }, 404) : json({ subscription: subscription() }),
      }),
    )
    const user = userEvent.setup()
    render(renderWithQuery(<EditSubscriptionContainer subscriptionId={SUB} />).tree)

    await screen.findByLabelText('Nombre')
    await user.click(save())
    expect(await screen.findByText('Suscripción no encontrada')).toBeTruthy()
    expect(navigate).not.toHaveBeenCalled()

    await user.click(save())
    await waitFor(() => expect(navigate).toHaveBeenCalled())
    expect(api.writes()).toHaveLength(2)
  })

  it('sends a double submit once, so it is not changed twice', async () => {
    let release: (() => void) | undefined
    const api = fakeApi(
      routes([subscription()], {
        [`PATCH /subscriptions/${SUB}`]: () => new Promise<Response>((resolve) => (release = () => resolve(json({ subscription: subscription() })))),
      }),
    )
    const { container } = render(renderWithQuery(<EditSubscriptionContainer subscriptionId={SUB} />).tree)

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

  it('says so when the subscription does not exist', async () => {
    fakeApi(routes([]))
    render(renderWithQuery(<EditSubscriptionContainer subscriptionId={SUB} />).tree)
    expect(await screen.findByText('No encontramos esa suscripción')).toBeTruthy()
  })
})
