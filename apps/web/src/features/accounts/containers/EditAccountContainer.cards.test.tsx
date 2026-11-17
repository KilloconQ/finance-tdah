import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { account, CARD } from '@/test/fixtures'
import { fakeApi, json, renderWithQuery } from '@/test/fake-api'

const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }))
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navigate }))

const { EditAccountContainer } = await import('./EditAccountContainer')

beforeEach(() => navigate.mockReset())
afterEach(cleanup)

const nu = (patch = {}) =>
  account({ id: CARD, name: 'Nu', type: 'credito', balanceCents: -100_000, cutoffDay: 10, paymentDay: 25, ...patch })

const statement = {
  cutoffDate: '2026-11-10',
  paymentDate: '2026-11-25',
  dueCents: 150_000,
  openPeriodCents: 40_000,
  nextCutoffDate: '2026-12-10',
}

const routes = (accounts = [nu()], statementResponse: () => Response = () => json({ statement })) => ({
  'GET /accounts': () => json({ accounts }),
  [`GET /accounts/${CARD}/statement`]: statementResponse,
  [`PATCH /accounts/${CARD}`]: () => json({ account: {} }),
})

const save = () => screen.getByRole('button', { name: 'Guardar cambios' })
const field = async (label: string) => (await screen.findByLabelText(label)) as HTMLInputElement
const open = () => render(renderWithQuery(<EditAccountContainer accountId={CARD} />).tree)

describe('editing a credit card (adversarial)', () => {
  it('keeps the stored days when only the name changes', async () => {
    const api = fakeApi(routes())
    const user = userEvent.setup()
    open()

    const name = await field('Nombre')
    await user.clear(name)
    await user.type(name, 'Nu Platino')
    await user.click(save())

    await waitFor(() => expect(api.writes()).toHaveLength(1))
    expect(api.writes()[0]!.body).toMatchObject({ name: 'Nu Platino', cutoffDay: 10, paymentDay: 25 })
  })

  it('sends null for both days when the user clears them', async () => {
    const api = fakeApi(routes())
    const user = userEvent.setup()
    open()

    await user.clear(await field('Día de corte'))
    await user.clear(await field('Día de pago'))
    await user.click(save())

    await waitFor(() => expect(api.writes()).toHaveLength(1))
    expect(api.writes()[0]!.body).toMatchObject({ cutoffDay: null, paymentDay: null })
  })

  it.each([
    ['only the cutoff is cleared', 'Día de corte'],
    ['only the payment day is cleared', 'Día de pago'],
  ])('refuses to save when %s, and sends nothing', async (_name, label) => {
    const api = fakeApi(routes())
    const user = userEvent.setup()
    open()

    await user.clear(await field(label))
    await user.click(save())

    expect(await screen.findByText('Pon el día de corte y el de pago, o deja los dos vacíos')).toBeTruthy()
    expect(api.writes()).toHaveLength(0)
  })

  it.each(['0', '00', '32', '99'])('refuses the day %s without calling the API', async (day) => {
    const api = fakeApi(routes())
    const user = userEvent.setup()
    open()

    const cutoff = await field('Día de corte')
    await user.clear(cutoff)
    await user.type(cutoff, day)
    await user.click(save())

    expect(await screen.findByText('Los días van del 1 al 31')).toBeTruthy()
    expect(api.writes()).toHaveLength(0)
  })

  it('only lets digits in, two at most', async () => {
    fakeApi(routes([nu({ cutoffDay: null, paymentDay: null })]))
    const user = userEvent.setup()
    open()

    const cutoff = await field('Día de corte')
    await user.type(cutoff, '3x-5.9')
    expect(cutoff.value).toBe('35')
  })

  it('stops sending days when the card becomes a debit account', async () => {
    const api = fakeApi(routes())
    const user = userEvent.setup()
    open()

    await field('Día de corte')
    await user.click(screen.getByRole('button', { name: /Débito/ }))
    expect(screen.queryByLabelText('Día de corte')).toBeNull()
    await user.click(save())

    await waitFor(() => expect(api.writes()).toHaveLength(1))
    const body = api.writes()[0]!.body!
    expect(body.type).toBe('debito')
    expect(body).not.toHaveProperty('cutoffDay')
    expect(body).not.toHaveProperty('paymentDay')
  })

  it('shows what is due for a card with days, and survives the statement failing', async () => {
    fakeApi(routes())
    open()
    expect(await screen.findByText(/Te toca pagar el|Debiste pagar el/)).toBeTruthy()
    cleanup()

    fakeApi(routes([nu()], () => json({ error: 'boom' }, 500)))
    open()
    expect(await field('Día de corte')).toBeTruthy()
    expect(screen.queryByText(/Te toca pagar el|Debiste pagar el/)).toBeNull()
  })

  it('does not ask for a statement when the card has no days', async () => {
    const api = fakeApi(routes([nu({ cutoffDay: null, paymentDay: null })]))
    open()
    await field('Nombre')
    expect(api.sent.filter((r) => r.path.endsWith('/statement'))).toHaveLength(0)
  })
})
