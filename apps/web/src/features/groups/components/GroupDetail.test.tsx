import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
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
  group: { id: G, name: 'Viaje', createdBy: 'ana', createdAt: NOW, members, myBalanceCents: 3_000 },
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
    expect(await screen.findByText('Ben te debe')).toBeTruthy()
    expect(screen.getByText('Te deben')).toBeTruthy()
    expect(screen.getAllByText('$30.00')).toHaveLength(2) // summary card and the debt row
  })

  it('words payers by name, and says “tú” for the signed-in user', async () => {
    fakeApi(routes())
    render(renderWithQuery(<GroupDetail groupId={G} />).tree)
    expect(await screen.findByText('Pagaste tú · entre 0')).toBeTruthy()
    expect(screen.getByText('Pagó Ben · entre 0')).toBeTruthy()
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
    expect(api.writes()).toHaveLength(0)
    await userEvent.click(within(screen.getByRole('dialog', { name: 'Saldar deuda' })).getByRole('button', { name: 'Saldar' }))
    await waitFor(() => expect(api.writes()).toHaveLength(1))
    expect(api.writes()[0].body).toMatchObject({ fromUserId: 'ben', toUserId: 'ana', amountCents: 3_000 })
  })

  it('splits a new expense among everyone ticked, paid by the signed-in user', async () => {
    const api = fakeApi({ ...routes(), [`POST /groups/${G}/expenses`]: () => json({}, 201) })
    render(renderWithQuery(<GroupDetail groupId={G} />).tree)
    await userEvent.click(await screen.findByRole('button', { name: 'Agregar gasto' }))
    const sheet = within(screen.getByRole('dialog', { name: 'Nuevo gasto' }))
    await userEvent.type(sheet.getByLabelText('Descripción'), 'Super')
    await userEvent.type(sheet.getByLabelText('Monto (en pesos)'), '12.50')
    await userEvent.click(sheet.getByRole('button', { name: 'Agregar gasto' }))
    await waitFor(() => expect(api.writes()).toHaveLength(1))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(api.writes()[0].body).toMatchObject({
      paidBy: 'ana', description: 'Super', amountCents: 1_250, participantIds: ['ana', 'ben'],
    })
  })

  it('sends custom amounts, and refuses ones that do not add up to the expense', async () => {
    const api = fakeApi({ ...routes(), [`POST /groups/${G}/expenses`]: () => json({}, 201) })
    render(renderWithQuery(<GroupDetail groupId={G} />).tree)
    await userEvent.click(await screen.findByRole('button', { name: 'Agregar gasto' }))
    const sheet = within(screen.getByRole('dialog', { name: 'Nuevo gasto' }))
    await userEvent.type(sheet.getByLabelText('Descripción'), 'Cine')
    await userEvent.type(sheet.getByLabelText('Monto (en pesos)'), '10')
    await userEvent.click(sheet.getByLabelText('Montos personalizados'))
    await userEvent.type(sheet.getByLabelText('Parte de Tú'), '7')
    await userEvent.type(sheet.getByLabelText('Parte de Ben'), '2')
    await userEvent.click(sheet.getByRole('button', { name: 'Agregar gasto' }))
    expect(await sheet.findByText('Las partes suman $9.00 y el gasto es de $10.00')).toBeTruthy()
    expect(api.writes()).toHaveLength(0)

    await userEvent.clear(sheet.getByLabelText('Parte de Ben'))
    await userEvent.type(sheet.getByLabelText('Parte de Ben'), '3')
    await userEvent.click(sheet.getByRole('button', { name: 'Agregar gasto' }))
    await waitFor(() => expect(api.writes()).toHaveLength(1))
    expect(api.writes()[0].body).toMatchObject({
      amountCents: 1_000,
      splits: [{ userId: 'ana', shareCents: 700 }, { userId: 'ben', shareCents: 300 }],
    })
  })

  it('edits an expense it can change: prefilled, saved with PUT', async () => {
    const withSplits = detail()
    withSplits.expenses[0].splits = [{ userId: 'ana', shareCents: 7_000 }, { userId: 'ben', shareCents: 3_000 }]
    const api = fakeApi({ ...routes(withSplits), [`PUT /groups/${G}/expenses/${E1}`]: () => json({}) })
    render(renderWithQuery(<GroupDetail groupId={G} />).tree)
    await userEvent.click((await screen.findAllByRole('button', { name: 'Editar gasto' }))[0])
    const sheet = within(screen.getByRole('dialog', { name: 'Editar gasto' }))
    expect((sheet.getByLabelText('Descripción') as HTMLInputElement).value).toBe('Cena')
    expect((sheet.getByLabelText('Parte de Ben') as HTMLInputElement).value).toBe('30.00') // uneven shares reopen as custom
    await userEvent.clear(sheet.getByLabelText('Descripción'))
    await userEvent.type(sheet.getByLabelText('Descripción'), 'Cena rica')
    await userEvent.click(sheet.getByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() => expect(api.writes()).toHaveLength(1))
    expect(api.writes()[0].body).toMatchObject({
      description: 'Cena rica', amountCents: 10_000, date: '2026-10-01',
      splits: [{ userId: 'ana', shareCents: 7_000 }, { userId: 'ben', shareCents: 3_000 }],
    })
  })

  it('only offers to delete expenses the user paid or created', async () => {
    fakeApi(routes())
    render(renderWithQuery(<GroupDetail groupId={G} />).tree)
    await screen.findByText('Cena')
    expect(screen.getAllByRole('button', { name: 'Borrar gasto' })).toHaveLength(1)
    expect(screen.getAllByRole('button', { name: 'Editar gasto' })).toHaveLength(1)
  })

  it('shows the API error when the email is not found', async () => {
    fakeApi({ ...routes(), [`POST /groups/${G}/members`]: () => json({ error: 'No pudimos agregar a esa persona' }, 404) })
    render(renderWithQuery(<GroupDetail groupId={G} />).tree)
    await userEvent.click(await screen.findByRole('button', { name: 'Agregar miembro' }))
    const sheet = within(screen.getByRole('dialog', { name: 'Agregar miembro' }))
    await userEvent.type(sheet.getByLabelText('Email'), 'zz@x.com')
    await userEvent.click(sheet.getByRole('button', { name: 'Agregar miembro' }))
    expect(await screen.findByText('No pudimos agregar a esa persona')).toBeTruthy()
  })

  it('asks before deleting an expense, and does nothing on cancel', async () => {
    const api = fakeApi({ ...routes(), [`DELETE /groups/${G}/expenses/${E1}`]: () => json({ ok: true }) })
    render(renderWithQuery(<GroupDetail groupId={G} />).tree)
    await userEvent.click(await screen.findByRole('button', { name: 'Borrar gasto' }))
    const dialog = within(screen.getByRole('dialog', { name: 'Borrar gasto' }))
    await userEvent.click(dialog.getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(api.writes()).toHaveLength(0)

    await userEvent.click(screen.getByRole('button', { name: 'Borrar gasto' }))
    await userEvent.click(within(screen.getByRole('dialog', { name: 'Borrar gasto' })).getByRole('button', { name: 'Borrar' }))
    await waitFor(() => expect(api.writes()).toHaveLength(1))
  })

  it('leaves the group after confirming and goes back to the list', async () => {
    const api = fakeApi({ ...routes(), [`DELETE /groups/${G}/members/me`]: () => json({ ok: true }) })
    render(renderWithQuery(<GroupDetail groupId={G} />).tree)
    await userEvent.click(await screen.findByRole('button', { name: 'Salir del grupo' }))
    expect(api.writes()).toHaveLength(0)
    await userEvent.click(within(screen.getByRole('dialog', { name: 'Salir del grupo' })).getByRole('button', { name: 'Salir' }))
    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: '/groups' }))
    expect(api.writes()).toHaveLength(1)
  })

  it('shows the API error when leaving with debts', async () => {
    fakeApi({ ...routes(), [`DELETE /groups/${G}/members/me`]: () => json({ error: 'Salda tus deudas antes de salir' }, 409) })
    render(renderWithQuery(<GroupDetail groupId={G} />).tree)
    await userEvent.click(await screen.findByRole('button', { name: 'Salir del grupo' }))
    await userEvent.click(within(screen.getByRole('dialog', { name: 'Salir del grupo' })).getByRole('button', { name: 'Salir' }))
    expect(await screen.findByText('Salda tus deudas antes de salir')).toBeTruthy()
    expect(navigate).not.toHaveBeenCalled()
  })
})
