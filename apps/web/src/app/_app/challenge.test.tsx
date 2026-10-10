import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { profileRoute, NOW } from '@/test/fixtures'
import { fakeApi, json, renderWithQuery } from '@/test/fake-api'
import type { ChallengeDTO } from '@finance-tdah/shared/schemas'

const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }))
vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (opts: unknown) => ({ options: opts }),
  useNavigate: () => navigate,
}))
vi.mock('@/components/TabBar', () => ({ TabBar: () => null }))

const { Route } = await import('./challenge')
const Challenge = (Route as unknown as { options: { component: () => React.ReactElement } }).options.component

beforeEach(() => navigate.mockReset())
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

const CHALLENGE_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
const TODAY = '2026-03-15'

const challenge = (patch: Partial<ChallengeDTO> = {}): ChallengeDTO => ({
  id: CHALLENGE_ID,
  userId: 'u',
  name: 'No gastar en café',
  description: 'Evitar comprar café fuera de casa',
  days: 7,
  doneDays: 3,
  expectedSavingsCents: 70_000,
  lastCheckedAt: null,
  startedAt: NOW,
  completedAt: null,
  failedAt: null,
  createdAt: NOW,
  ...patch,
})

const routes = (active: ChallengeDTO | null) => ({
  ...profileRoute,
  'GET /challenges/active': () => json({ challenge: active }),
})

describe('Challenge › active challenge', () => {
  it('shows the progress and what has been saved so far', async () => {
    fakeApi(routes(challenge()))
    render(renderWithQuery(<Challenge />).tree)

    expect(await screen.findByText('No gastar en café')).toBeTruthy()
    expect(screen.getByText('Evitar comprar café fuera de casa')).toBeTruthy()
    expect(screen.getByText('Día 3 de 7')).toBeTruthy()
    // $700 expected over 7 days, 3 done => $300
    expect(screen.getByText('$300.00')).toBeTruthy()
  })

  it('checks in for the day and refreshes the challenge', async () => {
    const user = userEvent.setup()
    let done = 3
    const api = fakeApi({
      ...profileRoute,
      'GET /challenges/active': () => json({ challenge: challenge({ doneDays: done }) }),
      [`POST /challenges/${CHALLENGE_ID}/check`]: () => {
        done = 4
        return json({})
      },
    })
    render(renderWithQuery(<Challenge />).tree)

    await user.click(await screen.findByRole('button', { name: 'Sigo en el reto 💪' }))

    expect(await screen.findByText('Día 4 de 7')).toBeTruthy()
    expect(api.writes()).toEqual([{ method: 'POST', path: `/challenges/${CHALLENGE_ID}/check`, body: undefined }])
  })

  it('does not let the user check in twice on the same day', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(`${TODAY}T12:00:00Z`))
    const api = fakeApi(routes(challenge({ lastCheckedAt: TODAY })))
    render(renderWithQuery(<Challenge />).tree)

    const button = await screen.findByRole('button', { name: 'Ya marcaste hoy ✓' })
    expect((button as HTMLButtonElement).disabled).toBe(true)
    expect(api.writes()).toEqual([])
  })

  it('skips (resets) the challenge and shows it back at day 0', async () => {
    const user = userEvent.setup()
    let done = 3
    const api = fakeApi({
      ...profileRoute,
      'GET /challenges/active': () => json({ challenge: challenge({ doneDays: done }) }),
      [`POST /challenges/${CHALLENGE_ID}/reset`]: () => {
        done = 0
        return json({})
      },
    })
    render(renderWithQuery(<Challenge />).tree)

    await user.click(await screen.findByRole('button', { name: 'Saltar' }))

    expect(await screen.findByText('Día 0 de 7')).toBeTruthy()
    expect(api.writes()).toEqual([{ method: 'POST', path: `/challenges/${CHALLENGE_ID}/reset`, body: undefined }])
  })

  it('shows the server error when checking in fails', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(`${TODAY}T12:00:00Z`))
    const user = userEvent.setup()
    let checkedElsewhere = false
    fakeApi({
      ...profileRoute,
      'GET /challenges/active': () =>
        json({ challenge: challenge({ lastCheckedAt: checkedElsewhere ? TODAY : null }) }),
      [`POST /challenges/${CHALLENGE_ID}/check`]: () => {
        checkedElsewhere = true
        return json({ error: 'Ya marcaste el día de hoy' }, 409)
      },
    })
    render(renderWithQuery(<Challenge />).tree)

    await user.click(await screen.findByRole('button', { name: 'Sigo en el reto 💪' }))

    expect((await screen.findByRole('alert')).textContent).toBe('Ya marcaste el día de hoy')
    // the failed check-in refreshes the challenge, so the button locks instead of staying stale
    const locked = await screen.findByRole('button', { name: 'Ya marcaste hoy ✓' })
    expect((locked as HTMLButtonElement).disabled).toBe(true)
  })

  it('shows the server error when skipping fails', async () => {
    const user = userEvent.setup()
    let fetches = 0
    fakeApi({
      ...profileRoute,
      'GET /challenges/active': () => {
        fetches++
        return json({ challenge: challenge() })
      },
      [`POST /challenges/${CHALLENGE_ID}/reset`]: () => json({ error: 'No hay reto activo' }, 404),
    })
    render(renderWithQuery(<Challenge />).tree)

    await user.click(await screen.findByRole('button', { name: 'Saltar' }))

    expect((await screen.findByRole('alert')).textContent).toBe('No hay reto activo')
    // the failed skip refetches the challenge
    await waitFor(() => expect(fetches).toBe(2))
  })

  it('goes back when the back button is pressed', async () => {
    const user = userEvent.setup()
    fakeApi(routes(challenge()))
    render(renderWithQuery(<Challenge />).tree)

    await screen.findByText('No gastar en café')
    await user.click(screen.getByRole('button', { name: 'Volver' }))
    expect(navigate).toHaveBeenCalledWith({ to: '..' })
  })
})

describe('Challenge › creating one', () => {
  const fill = async (user: ReturnType<typeof userEvent.setup>, name: string, description: string) => {
    if (name) await user.type(screen.getByLabelText('Nombre del reto'), name)
    if (description) await user.type(screen.getByLabelText('Descripción'), description)
  }

  it('asks for a name and a description before sending anything', async () => {
    const user = userEvent.setup()
    const api = fakeApi(routes(null))
    render(renderWithQuery(<Challenge />).tree)
    await screen.findByText('Crea un reto')

    await user.click(screen.getByRole('button', { name: 'Empezar reto' }))
    expect(screen.getByText('El nombre es obligatorio')).toBeTruthy()

    await fill(user, 'Sin café', '')
    await user.click(screen.getByRole('button', { name: 'Empezar reto' }))
    expect(screen.getByText('La descripción es obligatoria')).toBeTruthy()
    expect(api.writes()).toEqual([])
  })

  it('creates the challenge with the savings converted to cents', async () => {
    const user = userEvent.setup()
    let created = false
    const api = fakeApi({
      ...profileRoute,
      'GET /challenges/active': () => json({
          challenge: created
            ? challenge({ name: 'Sin café', description: 'Nada de café fuera', days: 10, doneDays: 0, expectedSavingsCents: 1234 })
            : null,
        }),
      'POST /challenges': () => {
        created = true
        return json({})
      },
    })
    render(renderWithQuery(<Challenge />).tree)
    await screen.findByText('Crea un reto')

    await fill(user, 'Sin café', 'Nada de café fuera')
    await user.clear(screen.getByLabelText('Duración (días)'))
    await user.type(screen.getByLabelText('Duración (días)'), '10')
    await user.type(screen.getByLabelText('Ahorro esperado (en pesos)'), '12.34')
    await user.click(screen.getByRole('button', { name: 'Empezar reto' }))

    expect(await screen.findByText('Día 0 de 10')).toBeTruthy()
    expect(screen.getByText('Sin café')).toBeTruthy()
    expect(api.writes()).toEqual([
      {
        method: 'POST',
        path: '/challenges',
        body: { name: 'Sin café', description: 'Nada de café fuera', days: 10, expectedSavingsCents: 1234 },
      },
    ])
  })

  it.each([
    ['99', 30],
    ['0', 1],
    ['-5', 1],
    ['', 7],
  ])('sends a duration of %j as %i days (clamped to 1–30, empty defaults to 7)', async (typed, days) => {
    const user = userEvent.setup()
    const api = fakeApi({ ...routes(null), 'POST /challenges': () => json({}) })
    render(renderWithQuery(<Challenge />).tree)
    await screen.findByText('Crea un reto')

    await fill(user, 'Sin café', 'Nada de café fuera')
    await user.clear(screen.getByLabelText('Duración (días)'))
    if (typed) await user.type(screen.getByLabelText('Duración (días)'), typed)
    await user.click(screen.getByRole('button', { name: 'Empezar reto' }))

    await waitFor(() => expect(api.writes()).toHaveLength(1))
    expect(api.writes()[0].body).toMatchObject({ days, expectedSavingsCents: 0 })
  })

  it('shows the error when the server rejects the challenge', async () => {
    const user = userEvent.setup()
    fakeApi({ ...routes(null), 'POST /challenges': () => json({ error: 'boom' }, 500) })
    render(renderWithQuery(<Challenge />).tree)
    await screen.findByText('Crea un reto')

    await fill(user, 'Sin café', 'Nada de café fuera')
    await user.click(screen.getByRole('button', { name: 'Empezar reto' }))

    expect((await screen.findByRole('alert')).textContent).toBe('boom')
  })
})
