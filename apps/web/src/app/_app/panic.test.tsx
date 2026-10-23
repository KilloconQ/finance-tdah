import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fakeApi, json, renderWithQuery } from '@/test/fake-api'

const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }))
vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (opts: unknown) => ({ options: opts }),
  useNavigate: () => navigate,
}))

const { Route } = await import('./panic')
const Panic = (Route as unknown as { options: { component: () => React.ReactElement } }).options.component

beforeEach(() => navigate.mockReset())
afterEach(cleanup)

const summary = (weekSpentCents: number, weekTargetCents = 220_000) => ({
  todayAvailableCents: 0,
  weekSpentCents,
  weekTargetCents,
  netWorthCents: 0,
  liquidCents: 0,
  jarsCents: 0,
  debtCents: 0,
  greeting: 'Hola',
})

const setup = (weekSpentCents: number) => {
  fakeApi({
    'GET /profile': () => json({ profile: null }),
    'GET /dashboard/home': () => json({ summary: summary(weekSpentCents) }),
  })
  render(renderWithQuery(<Panic />).tree)
  return userEvent.setup()
}

describe('Panic', () => {
  it('tells the user how much they overspent this week', async () => {
    setup(250_000)
    // $2,500 spent against a $2,200 target
    expect(await screen.findByText(/Te excediste por/)).toBeTruthy()
    expect(screen.getByText('$300.00')).toBeTruthy()
  })

  it('reassures the user who is within budget', async () => {
    setup(100_000)
    expect(await screen.findByText(/Vas dentro de tu presupuesto esta semana/)).toBeTruthy()
    expect(screen.queryByText(/Te excediste/)).toBeNull()
  })

  it('treats spending exactly the weekly target as within budget', async () => {
    setup(220_000)
    expect(await screen.findByText(/Vas dentro de tu presupuesto esta semana/)).toBeTruthy()
    expect(screen.queryByText(/Te excediste/)).toBeNull()
  })

  it('shows neutral copy while the summary has not loaded', async () => {
    fakeApi({
      'GET /profile': () => json({ profile: null }),
      'GET /dashboard/home': () => new Promise<Response>(() => {}),
    })
    render(renderWithQuery(<Panic />).tree)
    expect(await screen.findByText('Veamos qué podemos hacer ahora mismo.')).toBeTruthy()
    expect(screen.queryByText(/Te excediste|Vas dentro/)).toBeNull()
  })

  it('is a modal dialog offering the three recovery actions', async () => {
    setup(100_000)
    expect(screen.getByRole('dialog', { name: 'Modo pánico' })).toBeTruthy()
    for (const title of ['Ver suscripciones que no usas', 'Registrar solo lo esencial', 'Empezar un reto de ahorro']) {
      expect(screen.getByText(title)).toBeTruthy()
    }
  })

  it.each([
    ['Ver suscripciones que no usas', '/subscriptions'],
    ['Registrar solo lo esencial', '/add-expense'],
    ['Empezar un reto de ahorro', '/challenge'],
  ])('"%s" takes the user to %s', async (title, to) => {
    const user = setup(100_000)
    await user.click(screen.getByText(title))
    expect(navigate).toHaveBeenCalledWith({ to })
  })

  it('lets the user look at the damage in transactions', async () => {
    const user = setup(250_000)
    await user.click(screen.getByRole('button', { name: 'Ver mis movimientos' }))
    expect(navigate).toHaveBeenCalledWith({ to: '/transactions' })
  })

  it.each([
    ['the close button', async (u: ReturnType<typeof userEvent.setup>) => u.click(screen.getAllByRole('button', { name: 'Salir' })[0])],
    ['the exit button', async (u: ReturnType<typeof userEvent.setup>) => u.click(screen.getAllByRole('button', { name: 'Salir' })[1])],
    ['Escape', async (u: ReturnType<typeof userEvent.setup>) => u.keyboard('{Escape}')],
  ])('returns home with %s', async (_name, act) => {
    const user = setup(100_000)
    await act(user)
    expect(navigate).toHaveBeenCalledWith({ to: '/' })
  })
})
