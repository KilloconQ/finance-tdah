import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { GroupDetailDTO } from '@finance-tdah/shared/schemas'
import { NOW, profileRoute } from '@/test/fixtures'
import { fakeApi, json, renderWithQuery } from '@/test/fake-api'

const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }))
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navigate }))
vi.mock('@/components/TabBar', () => ({ TabBar: () => null }))
vi.mock('@/lib/session', () => ({
  sessionQuery: { queryKey: ['session'], queryFn: async () => ({ user: { id: 'ana' } }) },
}))

const { GroupDetail } = await import('./GroupDetail')

const G = '11111111-1111-4111-8111-111111111111'
const E1 = '22222222-2222-4222-8222-222222222222'
const E2 = '33333333-3333-4333-8333-333333333333'

const members = [
  { userId: 'ana', name: 'Ana', email: 'ana@x.com' },
  { userId: 'ben', name: 'Ben', email: 'ben@x.com' },
]

const detail = (patch: Partial<GroupDetailDTO> = {}): GroupDetailDTO => ({
  group: { id: G, name: 'Viaje', createdBy: 'ana', createdAt: NOW, members },
  expenses: [
    { id: E1, groupId: G, paidBy: 'ana', description: 'Cena', amountCents: 10_000, date: '2026-10-01', createdBy: 'ana', createdAt: NOW, splits: [] },
    { id: E2, groupId: G, paidBy: 'ben', description: 'Taxi', amountCents: 4_000, date: '2026-10-02', createdBy: 'ben', createdAt: NOW, splits: [] },
  ],
  settlements: [],
  balances: { balances: { ana: 3_000, ben: -3_000 }, debts: [{ from: 'ben', to: 'ana', amountCents: 3_000 }] },
  ...patch,
})

beforeEach(() => navigate.mockReset())
afterEach(cleanup)

const routes = (d = detail()) => ({
  ...profileRoute,
  [`GET /groups/${G}`]: () => json(d),
})

describe('GroupDetail', () => {
  it('shows who owes whom, from the signed-in user’s point of view', async () => {
    fakeApi(routes())
    render(renderWithQuery(<GroupDetail groupId={G} />).tree)
    expect(await screen.findByText(/Ben le debe a Vos/)).toBeTruthy()
    expect(screen.getByText('$30.00')).toBeTruthy()
  })

  it('says everyone is even when there are no debts', async () => {
    fakeApi(routes(detail({ balances: { balances: {}, debts: [] } })))
    render(renderWithQuery(<GroupDetail groupId={G} />).tree)
    expect(await screen.findByText(/Están a mano/)).toBeTruthy()
  })

  it('settles a debt with the exact amount owed', async () => {
    const api = fakeApi({ ...routes(), [`POST /groups/${G}/settlements`]: () => json({}, 201) })
    render(renderWithQuery(<GroupDetail groupId={G} />).tree)
    await userEvent.click(await screen.findByRole('button', { name: 'Saldar' }))
    await waitFor(() => expect(api.writes()).toHaveLength(1))
    expect(api.writes()[0].body).toMatchObject({ fromUserId: 'ben', toUserId: 'ana', amountCents: 3_000 })
  })

  it('splits a new expense among everyone ticked, paid by the signed-in user', async () => {
    const api = fakeApi({ ...routes(), [`POST /groups/${G}/expenses`]: () => json({}, 201) })
    render(renderWithQuery(<GroupDetail groupId={G} />).tree)
    await userEvent.type(await screen.findByLabelText('Descripción'), 'Super')
    await userEvent.type(screen.getByLabelText('Monto (en pesos)'), '12.50')
    await userEvent.click(screen.getByRole('button', { name: 'Agregar gasto' }))
    await waitFor(() => expect(api.writes()).toHaveLength(1))
    expect(api.writes()[0].body).toMatchObject({
      paidBy: 'ana', description: 'Super', amountCents: 1_250, participantIds: ['ana', 'ben'],
    })
  })

  it('only offers to delete expenses the user paid or created', async () => {
    fakeApi(routes())
    render(renderWithQuery(<GroupDetail groupId={G} />).tree)
    await screen.findByText('Cena')
    expect(screen.getAllByRole('button', { name: 'Borrar' })).toHaveLength(1)
  })

  it('shows the API error when the email is not found', async () => {
    fakeApi({ ...routes(), [`POST /groups/${G}/members`]: () => json({ error: 'No pudimos agregar a esa persona' }, 404) })
    render(renderWithQuery(<GroupDetail groupId={G} />).tree)
    await userEvent.type(await screen.findByLabelText('Agregar por email'), 'zz@x.com')
    await userEvent.click(screen.getByRole('button', { name: 'Agregar miembro' }))
    expect(await screen.findByText('No pudimos agregar a esa persona')).toBeTruthy()
  })
})
