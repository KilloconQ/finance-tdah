import { cleanup, render, screen, waitFor } from '@testing-library/react'
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
const group = { id: G, name: 'Viaje', createdBy: 'ana', createdAt: NOW, members: [{ userId: 'ana', name: 'Ana', email: 'a@x.com' }] }

beforeEach(() => navigate.mockReset())
afterEach(cleanup)

describe('Groups list', () => {
  it('lists the groups with their member count and opens one', async () => {
    fakeApi({ 'GET /groups': () => json({ groups: [group] }) })
    render(renderWithQuery(<Groups />).tree)
    await userEvent.click(await screen.findByText('Viaje'))
    expect(screen.getByText('1 miembro')).toBeTruthy()
    expect(navigate).toHaveBeenCalledWith({ to: '/groups/$id', params: { id: G } })
  })

  it('creates a group with the typed name', async () => {
    const api = fakeApi({ 'GET /groups': () => json({ groups: [] }), 'POST /groups': () => json({ group }, 201) })
    render(renderWithQuery(<Groups />).tree)
    await userEvent.type(await screen.findByLabelText('Nuevo grupo'), '  Viaje ')
    await userEvent.click(screen.getByRole('button', { name: 'Crear grupo' }))
    await waitFor(() => expect(api.writes()).toHaveLength(1))
    expect(api.writes()[0].body).toEqual({ name: 'Viaje' })
  })
})
