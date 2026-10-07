import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { account, BANK, CARD, envelope, FOOD, profileRoute, RENT } from '@/test/fixtures'
import { fakeApi, json, renderWithQuery } from '@/test/fake-api'

const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }))
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navigate }))

const { EnvelopesContainer } = await import('./EnvelopesContainer')

beforeEach(() => navigate.mockReset())
afterEach(cleanup)

const routes = (extra: Record<string, () => Response> = {}) => ({
  ...profileRoute,
  'GET /accounts': () =>
    json({ accounts: [account(), account({ id: CARD, name: 'Efectivo', type: 'efectivo', balanceCents: 50_000 })] }),
  'GET /envelopes': () =>
    json({
      envelopes: [
        envelope(),
        envelope({ id: FOOD, name: 'Súper', emoji: '🛒', balanceCents: 100_000 }),
        envelope({ id: '77777777-7777-4777-8777-777777777777', accountId: CARD, name: 'Viaje', emoji: '✈️', balanceCents: 20_000 }),
      ],
    }),
  ...extra,
})

const card = (name: string) => screen.getByText(name).closest('.rounded-2xl') as HTMLElement

describe('EnvelopesContainer', () => {
  it("lists only this account's envelopes, with what each one holds", async () => {
    fakeApi(routes())
    render(renderWithQuery(<EnvelopesContainer accountId={BANK} />).tree)

    expect(await screen.findByText('Renta')).toBeTruthy()
    expect(screen.getByText('Súper')).toBeTruthy()
    expect(screen.queryByText('Viaje')).toBeNull()
    expect(screen.getByText('Bloqueado').nextElementSibling?.textContent).toBe('$7,000.00')
    expect(screen.getByText('Disponible').nextElementSibling?.textContent).toBe('$3,000.00')
  })

  it('creates an envelope on this account, in cents', async () => {
    const api = fakeApi(routes({ 'POST /envelopes': () => json({ envelope: {} }, 201) }))
    const user = userEvent.setup()
    render(renderWithQuery(<EnvelopesContainer accountId={BANK} />).tree)

    await user.click(await screen.findByRole('button', { name: /Nueva cajita/ }))
    const form = within(screen.getByRole('form', { name: 'Nueva cajita' }))
    await user.type(form.getByLabelText('Para qué es'), 'Ropa')
    await user.type(form.getByLabelText('Cuánto apartar (opcional)'), '1250.50')
    await user.click(form.getByRole('button', { name: 'Crear cajita' }))

    await waitFor(() => expect(api.writes()).toHaveLength(1))
    expect(api.writes()[0]).toMatchObject({ method: 'POST', path: '/envelopes', body: { accountId: BANK, name: 'Ropa', amountCents: 125_050 } })
  })

  it('sets money aside and releases it', async () => {
    const api = fakeApi(routes({ [`POST /envelopes/${RENT}/adjust`]: () => json({ envelope: {} }) }))
    const user = userEvent.setup()
    render(renderWithQuery(<EnvelopesContainer accountId={BANK} />).tree)

    await screen.findByText('Renta')
    await user.click(within(card('Renta')).getByRole('button', { name: 'Apartar' }))
    await user.type(screen.getByLabelText('Cuánto apartar'), '500')
    await user.click(within(card('Renta')).getByRole('button', { name: 'Apartar' }))
    await waitFor(() => expect(api.writes()).toHaveLength(1))
    expect(api.writes()[0]!.body).toEqual({ deltaCents: 50_000 })

    await user.click(await within(card('Renta')).findByRole('button', { name: 'Liberar' }))
    await user.type(screen.getByLabelText('Cuánto liberar'), '200')
    await user.click(within(card('Renta')).getByRole('button', { name: 'Liberar' }))
    await waitFor(() => expect(api.writes()).toHaveLength(2))
    expect(api.writes()[1]!.body).toEqual({ deltaCents: -20_000 })
  })

  it("shows the API's reason when it refuses a move, and keeps the form open", async () => {
    const reason = 'No te alcanza: en esta cuenta solo quedan $3,000.00 sin apartar.'
    // The screen checks the same rule first, so the API's answer only matters when the
    // data moved meanwhile: here another device already set the money aside.
    fakeApi(routes({ [`POST /envelopes/${RENT}/adjust`]: () => json({ error: reason }, 422) }))
    const user = userEvent.setup()
    render(renderWithQuery(<EnvelopesContainer accountId={BANK} />).tree)

    await screen.findByText('Renta')
    await user.click(within(card('Renta')).getByRole('button', { name: 'Apartar' }))
    await user.type(screen.getByLabelText('Cuánto apartar'), '100')
    await user.click(within(card('Renta')).getByRole('button', { name: 'Apartar' }))

    expect(await screen.findByText(reason)).toBeTruthy()
    expect(screen.getByLabelText('Cuánto apartar')).toBeTruthy()
  })

  it('renames an envelope', async () => {
    const api = fakeApi(routes({ [`PATCH /envelopes/${RENT}`]: () => json({ envelope: {} }) }))
    const user = userEvent.setup()
    render(renderWithQuery(<EnvelopesContainer accountId={BANK} />).tree)

    await user.click(await screen.findByRole('button', { name: 'Renombrar Renta' }))
    const input = screen.getByLabelText('Nombre')
    await user.clear(input)
    await user.type(input, 'Depa')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() => expect(api.writes()).toHaveLength(1))
    expect(api.writes()[0]).toMatchObject({ method: 'PATCH', body: expect.objectContaining({ name: 'Depa' }) })
  })

  it('deletes an envelope after asking, and reloads the list', async () => {
    let deleted = false
    const api = fakeApi(
      routes({
        [`DELETE /envelopes/${RENT}`]: () => ((deleted = true), json({ ok: true })),
        'GET /envelopes': () =>
          json({ envelopes: deleted ? [envelope({ id: FOOD, name: 'Súper', balanceCents: 100_000 })] : [envelope(), envelope({ id: FOOD, name: 'Súper', balanceCents: 100_000 })] }),
      }),
    )
    const user = userEvent.setup()
    render(renderWithQuery(<EnvelopesContainer accountId={BANK} />).tree)

    await user.click(await screen.findByRole('button', { name: 'Borrar Renta' }))
    expect(api.writes()).toEqual([])
    await user.click(screen.getByRole('button', { name: 'Sí, borrar' }))

    await waitFor(() => expect(screen.queryByText('Renta')).toBeNull())
    expect(api.writes()).toEqual([{ method: 'DELETE', path: `/envelopes/${RENT}`, body: undefined }])
  })

  it('says so when the account does not exist, and goes back to the accounts', async () => {
    fakeApi(routes())
    const user = userEvent.setup()
    render(renderWithQuery(<EnvelopesContainer accountId="99999999-9999-4999-8999-999999999999" />).tree)

    expect(await screen.findByText('No encontramos esa cuenta')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: /atrás|volver|back/i }))
    expect(navigate).toHaveBeenCalledWith({ to: '/accounts' })
  })
})
