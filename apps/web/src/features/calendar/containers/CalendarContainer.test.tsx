import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { profileRoute } from '@/test/fixtures'
import { fakeApi, json, renderWithQuery } from '@/test/fake-api'

vi.mock('@/components/TabBar', () => ({ TabBar: () => null }))

const { CalendarContainer } = await import('./CalendarContainer')

// Only Date is faked: the query client and user-event keep their real timers.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-11-21T12:00:00') })
})
afterEach(() => {
  vi.useRealTimers()
  cleanup()
})

const INCOME = {
  id: '11111111-1111-4111-8111-111111111111',
  userId: 'u',
  name: 'Nómina',
  amountCents: 1_200_000,
  frequency: 'semimonthly',
  startsOn: '2026-11-15',
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
}

const event = (date: string, kind: string, title: string, amountCents: number | null) => ({ date, kind, title, amountCents, sourceId: `${kind}-${title}` })

const routes = (incomes: unknown[] = [INCOME]) => ({
  ...profileRoute,
  'GET /calendar': () =>
    json({
      today: '2026-11-21',
      events: [event('2026-11-05', 'card_payment', 'Visa', null), event('2026-11-21', 'subscription', 'Netflix', 19_900), event('2026-11-30', 'income', 'Nómina', 1_200_000)],
    }),
  'GET /incomes': () => json({ incomes }),
})

describe('Calendario', () => {
  it("opens on today's month and day, with that day's events", async () => {
    fakeApi(routes())
    render(renderWithQuery(<CalendarContainer />).tree)

    expect(await screen.findByText('noviembre de 2026')).toBeTruthy()
    expect(await screen.findByText('Netflix')).toBeTruthy()
    expect(screen.queryByText('Visa')).toBeNull()
    expect(screen.getByRole('button', { name: '21, Suscripción' }).getAttribute('aria-pressed')).toBe('true')
  })

  it('marks the days that have something and shows another day on tap', async () => {
    fakeApi(routes())
    render(renderWithQuery(<CalendarContainer />).tree)

    await userEvent.click(await screen.findByRole('button', { name: '5, Pago de tarjeta' }))
    expect(screen.getByText('Visa')).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: '30, Ingreso' }))
    expect(screen.getAllByText('Nómina').length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: '1' })).toBeTruthy() // an empty day has no label suffix
  })

  it('asks the API for the month shown when you move to the next one', async () => {
    const api = fakeApi(routes())
    render(renderWithQuery(<CalendarContainer />).tree)

    await userEvent.click(await screen.findByRole('button', { name: 'Mes siguiente' }))
    expect(await screen.findByText('diciembre de 2026')).toBeTruthy()
    const urls = api.sent.filter((r) => r.path === '/calendar').length
    expect(urls).toBeGreaterThanOrEqual(2)
  })

  it('invites you to add income when there is none', async () => {
    fakeApi(routes([]))
    render(renderWithQuery(<CalendarContainer />).tree)
    expect(await screen.findByText('Aún no registras ingresos')).toBeTruthy()
  })

  it('creates an income without an amount', async () => {
    const api = fakeApi({
      ...routes([]),
      'POST /incomes': () => json({ income: INCOME }, 201),
    })
    render(renderWithQuery(<CalendarContainer />).tree)

    await userEvent.click(await screen.findByRole('button', { name: 'Nuevo ingreso' }))
    await userEvent.type(screen.getByLabelText('Nombre'), 'Cobro cliente')
    await userEvent.click(screen.getByRole('button', { name: 'Una vez' }))
    await userEvent.type(screen.getByLabelText('Fecha'), '2026-11-25')
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Agregar ingreso' }))

    await waitFor(() => expect(api.writes()).toHaveLength(1))
    expect(api.writes()[0]).toMatchObject({
      method: 'POST',
      path: '/incomes',
      body: { name: 'Cobro cliente', amountCents: null, frequency: 'once', startsOn: '2026-11-25' },
    })
  })

  it('edits and deletes an income', async () => {
    const api = fakeApi({
      ...routes(),
      'PATCH /incomes/11111111-1111-4111-8111-111111111111': () => json({ income: INCOME }),
      'DELETE /incomes/11111111-1111-4111-8111-111111111111': () => json({ ok: true }),
    })
    render(renderWithQuery(<CalendarContainer />).tree)

    await userEvent.click(await screen.findByRole('button', { name: /Nómina\s*Quincenal/ }))
    const name = screen.getByLabelText('Nombre')
    await userEvent.clear(name)
    await userEvent.type(name, 'Sueldo')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    await waitFor(() => expect(api.writes()).toHaveLength(1))
    expect(api.writes()[0]).toMatchObject({ method: 'PATCH', body: { name: 'Sueldo', amountCents: 1_200_000 } })

    await userEvent.click(await screen.findByRole('button', { name: /Nómina\s*Quincenal/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Eliminar' }))
    await waitFor(() => expect(api.writes().map((w) => w.method)).toEqual(['PATCH', 'DELETE']))
  })

  it('rejects a bad amount before sending anything', async () => {
    const api = fakeApi(routes([]))
    render(renderWithQuery(<CalendarContainer />).tree)

    await userEvent.click(await screen.findByRole('button', { name: 'Nuevo ingreso' }))
    await userEvent.type(screen.getByLabelText('Nombre'), 'X')
    await userEvent.type(screen.getByLabelText(/Monto/), '0')
    await userEvent.type(screen.getByLabelText('Primer pago'), '2026-11-25')
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Agregar ingreso' }))
    expect(await screen.findByText("El monto debe ser mayor a $0")).toBeTruthy()
    expect(api.writes()).toHaveLength(0)
  })
})
