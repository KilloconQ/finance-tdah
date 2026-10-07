import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { account, BANK, CARD } from '@/test/fixtures'
import { fakeApi, json, renderWithQuery } from '@/test/fake-api'

const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }))
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navigate }))

const { EditAccountContainer } = await import('./EditAccountContainer')

beforeEach(() => navigate.mockReset())
afterEach(cleanup)

const routes = (accounts = [account()]) => ({
  'GET /accounts': () => json({ accounts }),
  [`PATCH /accounts/${BANK}`]: () => json({ account: {} }),
  [`PATCH /accounts/${CARD}`]: () => json({ account: {} }),
})

const save = () => screen.getByRole('button', { name: 'Guardar cambios' })
const balance = () => screen.getByLabelText(/Saldo actual|¿Cuánto debes\?/) as HTMLInputElement

describe('EditAccountContainer', () => {
  it('opens with the account as it was saved, showing a debt as a positive amount owed', async () => {
    fakeApi(routes([account({ id: CARD, name: 'Nu', type: 'credito', balanceCents: -289_050 })]))
    render(renderWithQuery(<EditAccountContainer accountId={CARD} />).tree)

    expect(((await screen.findByLabelText('Nombre')) as HTMLInputElement).value).toBe('Nu')
    expect(screen.getByLabelText('¿Cuánto debes?')).toBeTruthy()
    expect(balance().value).toBe('2890.5')
  })

  it('sends the new balance in cents and goes back to the accounts', async () => {
    const api = fakeApi(routes())
    const user = userEvent.setup()
    render(renderWithQuery(<EditAccountContainer accountId={BANK} />).tree)

    await screen.findByLabelText('Nombre')
    await user.clear(balance())
    await user.type(balance(), '9500.75')
    await user.click(save())

    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: '/accounts', replace: true }))
    expect(api.writes()).toEqual([
      { method: 'PATCH', path: `/accounts/${BANK}`, body: expect.objectContaining({ type: 'debito', balanceCents: 950_075 }) },
    ])
  })

  it('keeps an overdrawn debit account negative when an unrelated field is edited', async () => {
    const api = fakeApi(routes([account({ balanceCents: -50_000 })]))
    const user = userEvent.setup()
    render(renderWithQuery(<EditAccountContainer accountId={BANK} />).tree)

    const name = await screen.findByLabelText('Nombre')
    await user.clear(name)
    await user.type(name, 'BBVA personal')
    await user.click(save())

    await waitFor(() => expect(api.writes()).toHaveLength(1))
    expect(api.writes()[0]!.body).toMatchObject({ name: 'BBVA personal', balanceCents: -50_000 })
  })

  it('gives a zero balance the canonical sign of its type', async () => {
    const api = fakeApi(routes([account({ id: CARD, type: 'credito', balanceCents: 0 })]))
    const user = userEvent.setup()
    render(renderWithQuery(<EditAccountContainer accountId={CARD} />).tree)

    await screen.findByLabelText('Nombre')
    await user.type(balance(), '1000')
    await user.click(save())

    await waitFor(() => expect(api.writes()).toHaveLength(1))
    expect(api.writes()[0]!.body).toMatchObject({ type: 'credito', balanceCents: -100_000 })
  })

  it("re-signs the balance when the type changes: a debit account turned credit card owes it", async () => {
    const api = fakeApi(routes())
    const user = userEvent.setup()
    render(renderWithQuery(<EditAccountContainer accountId={BANK} />).tree)

    await screen.findByLabelText('Nombre')
    await user.click(screen.getByRole('button', { name: /Crédito/ }))
    await user.click(save())

    await waitFor(() => expect(api.writes()).toHaveLength(1))
    expect(api.writes()[0]!.body).toMatchObject({ type: 'credito', balanceCents: -1_000_000 })
  })

  it('refuses a balance that is not a number without calling the API', async () => {
    const api = fakeApi(routes())
    const user = userEvent.setup()
    render(renderWithQuery(<EditAccountContainer accountId={BANK} />).tree)

    await screen.findByLabelText('Nombre')
    await user.clear(balance())
    await user.type(balance(), 'abc')
    await user.click(save())

    expect(await screen.findByText('El saldo no es válido')).toBeTruthy()
    expect(api.writes()).toEqual([])
  })

  it("shows the API's reason, e.g. a card that can't take envelopes, and lets the user retry", async () => {
    const reason = 'Esta cuenta tiene cajitas: libéralas o bórralas antes de convertirla en tarjeta de crédito.'
    let attempt = 0
    const api = fakeApi({
      'GET /accounts': () => json({ accounts: [account()] }),
      [`PATCH /accounts/${BANK}`]: () => (++attempt === 1 ? json({ error: reason }, 422) : json({ account: {} })),
    })
    const user = userEvent.setup()
    render(renderWithQuery(<EditAccountContainer accountId={BANK} />).tree)

    await screen.findByLabelText('Nombre')
    await user.click(screen.getByRole('button', { name: /Crédito/ }))
    await user.click(save())
    expect(await screen.findByText(reason)).toBeTruthy()
    expect(navigate).not.toHaveBeenCalled()

    await user.click(save())
    await waitFor(() => expect(navigate).toHaveBeenCalled())
    expect(api.writes()).toHaveLength(2)
  })

  it('sends a double submit once, so the account is not changed twice', async () => {
    let release: (() => void) | undefined
    const api = fakeApi({
      'GET /accounts': () => json({ accounts: [account()] }),
      [`PATCH /accounts/${BANK}`]: () => new Promise<Response>((resolve) => (release = () => resolve(json({ account: {} })))),
    })
    const { container } = render(renderWithQuery(<EditAccountContainer accountId={BANK} />).tree)

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

  it('says so when the account no longer exists', async () => {
    fakeApi(routes([]))
    render(renderWithQuery(<EditAccountContainer accountId={BANK} />).tree)
    expect(await screen.findByText('No encontramos esa cuenta')).toBeTruthy()
  })
})
