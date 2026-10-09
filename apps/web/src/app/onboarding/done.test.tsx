import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearOnboardingDraft, setOnboardingDraft } from '@/lib/onboarding-draft'
import { fakeApi, json } from '@/test/fake-api'

const { navigate, getSession } = vi.hoisted(() => ({ navigate: vi.fn(), getSession: vi.fn() }))
vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (opts: unknown) => ({ options: opts }),
  useNavigate: () => navigate,
}))
vi.mock('@/lib/auth-client', () => ({ authClient: { getSession } }))

const { Route } = await import('./done')
const Done = (Route as unknown as { options: { component: () => React.ReactElement } }).options.component

const finish = () => screen.getByRole('button', { name: /Entrar a la app|Guardando/ })
const saved = { 'POST /profile/onboarding': () => json({ profile: {} }, 201) }

beforeEach(() => {
  navigate.mockReset()
  getSession.mockReset().mockResolvedValue({ data: { user: { name: 'Gaby' } } })
  window.localStorage.clear()
  clearOnboardingDraft()
})
afterEach(cleanup)

describe('Onboarding › done', () => {
  it('shows the last step', () => {
    render(<Done />)
    expect(screen.getByText('4 / 4')).toBeTruthy()
    expect(screen.getByRole('heading', { name: /Listo\./ })).toBeTruthy()
  })

  it('sends the whole draft with the goal target in cents, then clears it and enters the app', async () => {
    setOnboardingDraft({
      pain: ['impulso', 'subs'],
      firstGoal: { name: 'Laptop nueva', emoji: '💻', target: 30000 },
    })
    const api = fakeApi(saved)
    render(<Done />)

    await userEvent.setup().click(finish())

    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: '/', replace: true }))
    expect(api.writes()).toEqual([
      {
        method: 'POST',
        path: '/profile/onboarding',
        body: {
          displayName: 'Gaby',
          pain: ['impulso', 'subs'],
          inputPreference: 'manual',
          firstGoal: { name: 'Laptop nueva', emoji: '💻', targetCents: 3_000_000 },
        },
      },
    ])
    expect(window.localStorage.getItem('finance-tdah:onboarding-draft')).toBeNull()
  })

  it('sends no goal when the user skipped it', async () => {
    const api = fakeApi(saved)
    render(<Done />)

    await userEvent.setup().click(finish())

    await waitFor(() => expect(navigate).toHaveBeenCalled())
    expect(api.writes()[0].body).toEqual({ displayName: 'Gaby', pain: [], inputPreference: 'manual' })
  })

  it('falls back to a generic name when there is no session user', async () => {
    getSession.mockResolvedValue({ data: null })
    const api = fakeApi(saved)
    render(<Done />)

    await userEvent.setup().click(finish())

    await waitFor(() => expect(navigate).toHaveBeenCalled())
    expect(api.writes()[0].body?.displayName).toBe('Tú')
  })

  it('disables the button while saving so it cannot be sent twice', async () => {
    let release!: () => void
    const api = fakeApi({
      'POST /profile/onboarding': () =>
        new Promise<Response>((resolve) => {
          release = () => resolve(json({ profile: {} }, 201))
        }),
    })
    render(<Done />)
    const user = userEvent.setup()

    await user.click(finish())
    await waitFor(() => expect(screen.getByRole('button', { name: 'Guardando…' }).hasAttribute('disabled')).toBe(true))
    await user.click(finish())
    release()

    await waitFor(() => expect(navigate).toHaveBeenCalledTimes(1))
    expect(api.writes()).toHaveLength(1)
  })

  it('shows the failure, keeps the draft and lets the user retry', async () => {
    setOnboardingDraft({ pain: ['saldo'] })
    let fail = true
    const api = fakeApi({
      'POST /profile/onboarding': () => (fail ? json({ error: 'boom' }, 500) : json({ profile: {} }, 201)),
    })
    render(<Done />)
    const user = userEvent.setup()

    await user.click(finish())

    await waitFor(() => expect(screen.getByRole('button', { name: 'Entrar a la app' }).hasAttribute('disabled')).toBe(false))
    expect(screen.getByText(/\S/, { selector: '.text-danger' })).toBeTruthy()
    expect(navigate).not.toHaveBeenCalled()
    expect(window.localStorage.getItem('finance-tdah:onboarding-draft')).not.toBeNull()

    fail = false
    await user.click(finish())
    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: '/', replace: true }))
    expect(api.writes()).toHaveLength(2)
  })

  it('shows the failure when the session cannot be read, without calling the API', async () => {
    getSession.mockRejectedValue(new Error('offline'))
    const api = fakeApi(saved)
    render(<Done />)

    await userEvent.setup().click(finish())

    expect(await screen.findByText('offline')).toBeTruthy()
    expect(api.writes()).toHaveLength(0)
  })
})
