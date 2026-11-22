import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { fakeApi, json, renderWithQuery } from '@/test/fake-api'
import { NotificationRulesContainer } from './NotificationRulesContainer'

afterEach(cleanup)

const RULES = [
  { kind: 'income', enabled: true, daysBefore: 0, hour: 19 },
  { kind: 'card_cutoff', enabled: true, daysBefore: 2, hour: 9 },
  { kind: 'card_payment', enabled: true, daysBefore: 4, hour: 9 },
  { kind: 'subscription_monthly', enabled: true, daysBefore: 1, hour: 9 },
  { kind: 'subscription_yearly', enabled: false, daysBefore: 7, hour: 9 },
]

const group = async (name: string) => within(await screen.findByRole('group', { name }))

describe('Avisos del calendario', () => {
  it('shows each kind with its days and hour, and no options for a disabled one', async () => {
    fakeApi({ 'GET /notification-rules': () => json({ rules: RULES }) })
    render(renderWithQuery(<NotificationRulesContainer />).tree)

    const income = await group('Cuando me toca cobrar')
    expect(await income.findByDisplayValue('El mismo día')).toBeTruthy()
    expect(income.getByDisplayValue('7:00 pm')).toBeTruthy()
    expect((await group('Pago de tarjeta')).getByDisplayValue('4 días antes')).toBeTruthy()
    expect((await group('Suscripciones mensuales')).getByDisplayValue('1 día antes')).toBeTruthy()
    expect((await group('Suscripciones anuales')).queryByDisplayValue('7 días antes')).toBeNull()
  })

  it('saves a changed number of days for that kind', async () => {
    const api = fakeApi({
      'GET /notification-rules': () => json({ rules: RULES }),
      'PUT /notification-rules/card_payment': () => json({ rule: RULES[2] }),
    })
    render(renderWithQuery(<NotificationRulesContainer />).tree)

    const select = await (await group('Pago de tarjeta')).findByDisplayValue('4 días antes')
    await userEvent.selectOptions(select, '3')
    await waitFor(() => expect(api.writes()).toHaveLength(1))
    expect(api.writes()[0]).toMatchObject({ method: 'PUT', path: '/notification-rules/card_payment', body: { enabled: true, daysBefore: 3, hour: 9 } })
  })

  it('turns a kind on again, keeping its days and hour', async () => {
    const api = fakeApi({
      'GET /notification-rules': () => json({ rules: RULES }),
      'PUT /notification-rules/subscription_yearly': () => json({ rule: RULES[4] }),
    })
    render(renderWithQuery(<NotificationRulesContainer />).tree)

    await userEvent.click((await group('Suscripciones anuales')).getByRole('checkbox'))
    await waitFor(() => expect(api.writes()).toHaveLength(1))
    expect(api.writes()[0]!.body).toEqual({ enabled: true, daysBefore: 7, hour: 9 })
  })

  it('says so when the options cannot be loaded', async () => {
    fakeApi({ 'GET /notification-rules': () => json({ error: 'x' }, 500) })
    render(renderWithQuery(<NotificationRulesContainer />).tree)
    expect(await screen.findByText('No pudimos cargar tus avisos del calendario.')).toBeTruthy()
  })
})
