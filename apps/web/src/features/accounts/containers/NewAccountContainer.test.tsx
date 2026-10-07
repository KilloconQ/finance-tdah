import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fakeApi, json, renderWithQuery } from '@/test/fake-api'

const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }))
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navigate }))

const { NewAccountContainer } = await import('./NewAccountContainer')

beforeEach(() => navigate.mockReset())
afterEach(cleanup)

const created = { 'POST /accounts': () => json({ account: {} }, 201) }

async function fill(user: ReturnType<typeof userEvent.setup>, { type, balance }: { type?: string; balance?: string } = {}) {
  await user.type(screen.getByLabelText('Nombre'), 'Mi cuenta')
  if (type) await user.click(screen.getByRole('button', { name: new RegExp(type) }))
  if (balance !== undefined) await user.type(screen.getByLabelText(/Saldo actual|¿Cuánto debes\?/), balance)
}

const save = () => screen.getByRole('button', { name: /Guardar|Crear|Agregar/ })

describe('NewAccountContainer', () => {
  it('stores what a card owes as a negative balance', async () => {
    const api = fakeApi(created)
    const user = userEvent.setup()
    render(renderWithQuery(<NewAccountContainer />).tree)

    await fill(user, { type: 'Crédito', balance: '2890' })
    await user.click(save())

    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: '/accounts', replace: true }))
    expect(api.writes()[0]!.body).toMatchObject({ name: 'Mi cuenta', type: 'credito', balanceCents: -289_000 })
  })

  it('stores a debit account as positive money, in cents', async () => {
    const api = fakeApi(created)
    const user = userEvent.setup()
    render(renderWithQuery(<NewAccountContainer />).tree)

    await fill(user, { type: 'Débito', balance: '8420.50' })
    await user.click(save())

    await waitFor(() => expect(api.writes()).toHaveLength(1))
    expect(api.writes()[0]!.body).toMatchObject({ type: 'debito', balanceCents: 842_050 })
  })

  it('treats an empty balance as a new $0 account', async () => {
    const api = fakeApi(created)
    const user = userEvent.setup()
    render(renderWithQuery(<NewAccountContainer />).tree)

    await fill(user)
    await user.click(save())

    await waitFor(() => expect(api.writes()).toHaveLength(1))
    expect(api.writes()[0]!.body).toMatchObject({ balanceCents: 0 })
  })

  it('refuses a balance that is not a number without calling the API', async () => {
    const api = fakeApi(created)
    const user = userEvent.setup()
    render(renderWithQuery(<NewAccountContainer />).tree)

    await fill(user, { balance: '12.3.4' })
    await user.click(save())

    expect(await screen.findByText('El saldo no es válido')).toBeTruthy()
    expect(api.writes()).toEqual([])
  })

  it("shows the API's reason and lets the user try again", async () => {
    let attempt = 0
    const api = fakeApi({
      'POST /accounts': () => (++attempt === 1 ? json({ error: 'Ya tienes una cuenta con ese nombre' }, 409) : json({ account: {} }, 201)),
    })
    const user = userEvent.setup()
    render(renderWithQuery(<NewAccountContainer />).tree)

    await fill(user, { balance: '100' })
    await user.click(save())
    expect(await screen.findByText('Ya tienes una cuenta con ese nombre')).toBeTruthy()
    expect(navigate).not.toHaveBeenCalled()

    await user.click(save())
    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: '/accounts', replace: true }))
    expect(api.writes()).toHaveLength(2)
  })

  it('sends a double submit once, so the account is not created twice', async () => {
    let release: (() => void) | undefined
    const api = fakeApi({
      'POST /accounts': () => new Promise<Response>((resolve) => (release = () => resolve(json({ account: {} }, 201)))),
    })
    const user = userEvent.setup()
    const { container } = render(renderWithQuery(<NewAccountContainer />).tree)

    await fill(user, { balance: '100' })
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
