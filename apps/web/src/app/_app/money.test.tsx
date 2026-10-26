import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { FinancialAccountDTO, GoalDTO, SubscriptionDTO } from '@finance-tdah/shared/schemas'
import { BANK, CARD, GOAL, NOW, SUB, SUB_2, account, goal, profileRoute, subscription } from '@/test/fixtures'
import { fakeApi, json, renderWithQuery } from '@/test/fake-api'

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (opts: unknown) => ({ options: opts }),
  Link: ({
    to,
    params,
    ...rest
  }: { to: string; params?: Record<string, string> } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={to.replace('$id', params?.id ?? '$id')} {...rest} />
  ),
}))
vi.mock('@/components/TabBar', () => ({ TabBar: () => null }))

const { Route } = await import('./money')
const Money = (Route as unknown as { options: { component: () => React.ReactElement } }).options.component

afterEach(cleanup)

const routes = ({
  accounts = [account(), account({ id: CARD, name: 'Tarjeta Oro', type: 'credito', balanceCents: -50_000 })],
  goals = [goal()],
  subs = [subscription(), subscription({ id: SUB_2, name: 'Nube', amountCents: 120_000, cadence: 'yearly' })],
  profile = null as Record<string, unknown> | null,
}: {
  accounts?: FinancialAccountDTO[]
  goals?: GoalDTO[]
  subs?: SubscriptionDTO[]
  profile?: Record<string, unknown> | null
} = {}) => ({
  ...profileRoute,
  ...(profile ? { 'GET /profile': () => json({ profile }) } : {}),
  'GET /accounts': () => json({ accounts }),
  'GET /goals': () => json({ goals }),
  'GET /subscriptions': () => json({ subscriptions: subs }),
})

const tile = (name: RegExp) => screen.getByRole('button', { name })
const section = (name: string) => screen.getByRole('region', { name })

describe('Money (Dinero)', () => {
  it('sums each area in a tile: money in accounts, saved in jars, subscriptions per month', async () => {
    fakeApi(routes())
    render(renderWithQuery(<Money />).tree)

    // A credit card's debt is not money you have: only positive balances count.
    await waitFor(() => expect(within(tile(/^Cuentas/)).getByText('$10,000.00')).toBeTruthy())
    // ...and the debt is said right there, like on the accounts screen.
    expect(within(tile(/^Cuentas/)).getByText('debes $500.00')).toBeTruthy()
    expect(within(tile(/^Frascos/)).getByText('$4,000.00')).toBeTruthy()
    expect(within(tile(/^Frascos/)).getByText('1 frasco')).toBeTruthy()
    // A yearly plan counts a twelfth per month: $269 + $1,200 / 12.
    expect(within(tile(/^Suscripciones/)).getByText('$369.00')).toBeTruthy()
    expect(within(tile(/^Suscripciones/)).getByText('al mes · 2')).toBeTruthy()
  })

  it('counts the accounts when nothing is owed', async () => {
    fakeApi(routes({ accounts: [account()] }))
    render(renderWithQuery(<Money />).tree)

    await waitFor(() => expect(within(tile(/^Cuentas/)).getByText('1 cuenta')).toBeTruthy())
  })

  it('jumps to a section when its tile is tapped', async () => {
    // jsdom has no scrollIntoView; stub it for this test only.
    const scrollIntoView = vi.fn()
    Element.prototype.scrollIntoView = scrollIntoView
    try {
      fakeApi(routes())
      render(renderWithQuery(<Money />).tree)

      await userEvent.click(await screen.findByRole('button', { name: /^Suscripciones/ }))

      expect(scrollIntoView).toHaveBeenCalledTimes(1)
      expect(scrollIntoView.mock.contexts[0]).toBe(section('Suscripciones'))
    } finally {
      delete (Element.prototype as Partial<Element>).scrollIntoView
    }
  })

  it('says a section failed to load instead of showing it empty, and retries', async () => {
    let fail = true
    fakeApi({
      ...routes(),
      'GET /accounts': () => (fail ? json({ error: 'boom' }, 500) : json({ accounts: [account()] })),
    })
    render(renderWithQuery(<Money />).tree)

    expect(await screen.findByText('No pudimos cargar tus cuentas.')).toBeTruthy()
    // Never "you have none": that would push the user to create duplicates.
    expect(screen.queryByText('Aún no tienes cuentas')).toBeNull()
    expect(within(tile(/^Cuentas/)).queryByText(/\$\d/)).toBeNull()
    expect(within(tile(/^Cuentas/)).queryByText(/cuenta/)).toBeNull()

    fail = false
    await userEvent.click(within(section('Cuentas')).getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByText('Débito BBVA')).toBeTruthy()
  })

  it('lists every account, jar and subscription, each opening its own screen', async () => {
    fakeApi(routes())
    render(renderWithQuery(<Money />).tree)

    await screen.findByText('Débito BBVA')
    const href = (name: RegExp) => screen.getByRole('link', { name }).getAttribute('href')
    expect(href(/Débito BBVA/)).toBe(`/accounts/${BANK}`)
    expect(href(/Tarjeta Oro/)).toBe(`/accounts/${CARD}`)
    expect(href(/Vacaciones/)).toBe(`/goals/${GOAL}`)
    expect(href(/Netflix/)).toBe(`/subscriptions/${SUB}`)
    expect(href(/Nube/)).toBe(`/subscriptions/${SUB_2}`)
  })

  it('links each section to its full screen', async () => {
    fakeApi(routes())
    render(renderWithQuery(<Money />).tree)

    await screen.findByText('Débito BBVA')
    for (const [name, to] of [
      ['Cuentas', '/accounts'],
      ['Frascos', '/goals'],
      ['Suscripciones', '/subscriptions'],
    ]) {
      expect(within(section(name)).getByRole('link', { name: 'Ver todo' }).getAttribute('href')).toBe(to)
    }
  })

  it('offers to add the first item of an empty section', async () => {
    fakeApi(routes({ accounts: [], goals: [], subs: [] }))
    render(renderWithQuery(<Money />).tree)

    const add = async (name: string) =>
      (await screen.findByRole('link', { name })).getAttribute('href')
    expect(await add('Agregar cuenta')).toBe('/accounts/new')
    expect(await add('Crear frasco')).toBe('/goals/new')
    expect(await add('Agregar suscripción')).toBe('/subscriptions/new')
  })

  it('masks every amount when balances are hidden', async () => {
    fakeApi(
      routes({
        profile: {
          userId: 'u',
          displayName: 'Ana',
          pain: [],
          inputPreference: 'voice',
          densityMode: 'simple',
          showBalances: false,
          weeklyBudgetCents: 220_000,
          onboardingCompleted: true,
          createdAt: NOW,
          updatedAt: NOW,
        },
      }),
    )
    render(renderWithQuery(<Money />).tree)

    await screen.findByText('Débito BBVA')
    await waitFor(() => expect(screen.queryAllByText(/\$\d/)).toEqual([]))
  })
})
