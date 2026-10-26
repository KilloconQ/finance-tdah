import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NOW } from '@/test/fixtures'
import { fakeApi, json, renderWithQuery } from '@/test/fake-api'

const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }))
vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (opts: unknown) => ({ options: opts }),
  useNavigate: () => navigate,
}))
vi.mock('@/components/TabBar', () => ({ TabBar: () => null }))

const { Route } = await import('./index')
const Groups = (Route as unknown as { options: { component: () => React.ReactElement } }).options.component

const G = '11111111-1111-4111-8111-111111111111'
const group = { id: G, name: 'Viaje', createdBy: 'ana', createdAt: NOW, members: [{ userId: 'ana', name: 'Ana', email: 'a@x.com' }], myBalanceCents: 0 }

const INV = '44444444-4444-4444-8444-444444444444'
const invitation = { id: INV, groupId: G, groupName: 'Viaje', invitedByName: 'Ana', createdAt: NOW }
const noInvitations = { 'GET /invitations': () => json({ invitations: [] }) }

beforeEach(() => navigate.mockReset())
afterEach(cleanup)

describe('Groups list', () => {
  it('lists the groups with their member count and opens one', async () => {
    fakeApi({ ...noInvitations, 'GET /groups': () => json({ groups: [group] }) })
    render(renderWithQuery(<Groups />).tree)
    await userEvent.click(await screen.findByText('Viaje'))
    expect(screen.queryByText('Invitaciones')).toBeNull()
    expect(screen.getByText('1 miembro')).toBeTruthy()
    expect(navigate).toHaveBeenCalledWith({ to: '/groups/$id', params: { id: G } })
  })

  it('shows what each group owes you and the totals across groups', async () => {
    const owed = { ...group, myBalanceCents: 86_000 }
    const owing = { ...group, id: '22222222-2222-4222-8222-222222222222', name: 'Depa', myBalanceCents: -31_000 }
    fakeApi({ ...noInvitations, 'GET /groups': () => json({ groups: [owed, owing, { ...group, id: '33333333-3333-4333-8333-333333333333', name: 'Cena' }] }) })
    render(renderWithQuery(<Groups />).tree)
    await screen.findByText('Viaje')
    expect(screen.getAllByText('$860.00')).toHaveLength(2) // total owed and the group row
    expect(screen.getAllByText('$310.00')).toHaveLength(2)
    expect(screen.getByText('te deben')).toBeTruthy()
    expect(screen.getByText('debes')).toBeTruthy()
    expect(screen.getByText('A mano')).toBeTruthy()
  })

  it('creates a group with the typed name', async () => {
    const api = fakeApi({ ...noInvitations, 'GET /groups': () => json({ groups: [] }), 'POST /groups': () => json({ group }, 201) })
    render(renderWithQuery(<Groups />).tree)
    await userEvent.click(await screen.findByRole('button', { name: 'Nuevo grupo' }))
    const sheet = within(screen.getByRole('dialog', { name: 'Nuevo grupo' }))
    await userEvent.type(sheet.getByLabelText('Nombre'), '  Viaje ')
    await userEvent.click(sheet.getByRole('button', { name: 'Crear grupo' }))
    await waitFor(() => expect(api.writes()).toHaveLength(1))
    expect(api.writes()[0].body).toEqual({ name: 'Viaje' })
  })
})

describe('Group invitations', () => {
  it('shows who invited you even before you have any group, and joins on accept', async () => {
    let accepted = false
    const api = fakeApi({
      'GET /groups': () => json({ groups: accepted ? [group] : [] }),
      'GET /invitations': () => json({ invitations: accepted ? [] : [invitation] }),
      [`POST /invitations/${INV}/accept`]: () => {
        accepted = true
        return json({ groupId: G })
      },
    })
    render(renderWithQuery(<Groups />).tree)
    expect(await screen.findByText('Ana te invitó')).toBeTruthy()
    expect(screen.getByText('Invitaciones')).toBeTruthy()

    await userEvent.click(screen.getByRole('button', { name: 'Aceptar invitación a Viaje' }))

    await waitFor(() => expect(screen.queryByText('Ana te invitó')).toBeNull())
    expect(await screen.findByText('1 miembro')).toBeTruthy() // the group is now in the list
    expect(api.writes()).toEqual([{ method: 'POST', path: `/invitations/${INV}/accept`, body: undefined }])
  })

  it('drops the invitation card right away on accept, without flashing the empty state while the group loads', async () => {
    let release!: (r: Response) => void
    const slowGroups = new Promise<Response>((resolve) => (release = resolve))
    let accepted = false
    let groupLoads = 0
    const api = fakeApi({
      'GET /groups': () => (groupLoads++ === 0 ? json({ groups: [] }) : slowGroups),
      'GET /invitations': () => json({ invitations: accepted ? [] : [invitation] }),
      [`POST /invitations/${INV}/accept`]: () => {
        accepted = true
        return json({ groupId: G })
      },
    })
    render(renderWithQuery(<Groups />).tree)
    await userEvent.click(await screen.findByRole('button', { name: 'Aceptar invitación a Viaje' }))

    // The new group is still loading: the card is already gone and "no groups" has not appeared.
    await waitFor(() => expect(screen.queryByText('Ana te invitó')).toBeNull())
    expect(screen.queryByText('Aún no tienes grupos')).toBeNull()

    release(json({ groups: [group] }))
    expect(await screen.findByText('1 miembro')).toBeTruthy()
    expect(screen.queryByText('Ana te invitó')).toBeNull()
    expect(screen.queryByText('Aún no tienes grupos')).toBeNull()
    expect(api.writes()).toEqual([{ method: 'POST', path: `/invitations/${INV}/accept`, body: undefined }])
  })

  it('declines without joining anything', async () => {
    let declined = false
    const api = fakeApi({
      'GET /groups': () => json({ groups: [] }),
      'GET /invitations': () => json({ invitations: declined ? [] : [invitation] }),
      [`POST /invitations/${INV}/decline`]: () => {
        declined = true
        return json({ ok: true })
      },
    })
    render(renderWithQuery(<Groups />).tree)
    await userEvent.click(await screen.findByRole('button', { name: 'Declinar invitación a Viaje' }))

    await waitFor(() => expect(screen.queryByText('Ana te invitó')).toBeNull())
    expect(screen.queryByText('1 miembro')).toBeNull()
    expect(api.writes()).toEqual([{ method: 'POST', path: `/invitations/${INV}/decline`, body: undefined }])
  })

  it('says so when the invitation can no longer be answered', async () => {
    fakeApi({
      'GET /groups': () => json({ groups: [] }),
      'GET /invitations': () => json({ invitations: [invitation] }),
      [`POST /invitations/${INV}/accept`]: () => json({ error: 'Invitación no encontrada' }, 404),
    })
    render(renderWithQuery(<Groups />).tree)
    await userEvent.click(await screen.findByRole('button', { name: 'Aceptar invitación a Viaje' }))
    expect(await screen.findByText('No pudimos responder la invitación')).toBeTruthy()
    // The invitation list was refetched, so the card is back (it may still be answerable, or really gone).
    expect(await screen.findByText('Ana te invitó')).toBeTruthy()
    expect(screen.getByText('Aún no tienes grupos')).toBeTruthy()
  })
})
