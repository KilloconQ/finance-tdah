import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { navigate, authClient } = vi.hoisted(() => ({
  navigate: vi.fn(),
  authClient: {
    signIn: { email: vi.fn() },
    signUp: { email: vi.fn() },
    requestPasswordReset: vi.fn(),
    resetPassword: vi.fn(),
  },
}))
vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (opts: unknown) => ({ options: opts }),
  useNavigate: () => navigate,
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => <a href={to}>{children}</a>,
}))
vi.mock('@/lib/auth-client', () => ({ authClient }))

const { Route } = await import('./sign-in')
const SignIn = (Route as unknown as { options: { component: () => React.ReactElement } }).options.component

beforeEach(() => {
  navigate.mockReset()
  authClient.signIn.email.mockReset()
})
afterEach(cleanup)

async function fill(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Email'), 'ana@example.com')
  await user.type(screen.getByLabelText('Contraseña'), 'secret-pass')
}

describe('Auth › sign-in', () => {
  it('keeps "Entrar" disabled until email and password are filled', async () => {
    const user = userEvent.setup()
    render(<SignIn />)
    const submit = screen.getByRole('button', { name: 'Entrar' }) as HTMLButtonElement
    expect(submit.disabled).toBe(true)

    await user.type(screen.getByLabelText('Email'), 'ana@example.com')
    expect(submit.disabled).toBe(true)
    await user.type(screen.getByLabelText('Contraseña'), 'secret-pass')
    expect(submit.disabled).toBe(false)
  })

  it('signs in with the typed credentials and goes home, replacing history', async () => {
    authClient.signIn.email.mockResolvedValue({ data: {}, error: null })
    const user = userEvent.setup()
    render(<SignIn />)
    await fill(user)
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(authClient.signIn.email).toHaveBeenCalledWith({ email: 'ana@example.com', password: 'secret-pass' })
    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: '/', replace: true }))
  })

  it('shows a wrong-password error and stays on the screen', async () => {
    authClient.signIn.email.mockResolvedValue({
      data: null,
      error: { status: 401, code: 'INVALID_EMAIL_OR_PASSWORD' },
    })
    const user = userEvent.setup()
    render(<SignIn />)
    await fill(user)
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByText('Email o contraseña incorrectos.')).toBeTruthy()
    expect(navigate).not.toHaveBeenCalled()
  })

  it('tells an API outage apart from a wrong password', async () => {
    authClient.signIn.email.mockResolvedValue({ data: null, error: { status: 502 } })
    const user = userEvent.setup()
    render(<SignIn />)
    await fill(user)
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByText(/El servidor no está respondiendo/)).toBeTruthy()
    expect(screen.queryByText('Email o contraseña incorrectos.')).toBeNull()
  })

  it('shows the offline message when the request throws', async () => {
    authClient.signIn.email.mockRejectedValue(new TypeError('Failed to fetch'))
    const user = userEvent.setup()
    render(<SignIn />)
    await fill(user)
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByText(/No pudimos conectar con el servidor/)).toBeTruthy()
  })

  it('re-enables the button after a failure so the user can retry', async () => {
    authClient.signIn.email.mockResolvedValue({ data: null, error: { status: 429 } })
    const user = userEvent.setup()
    render(<SignIn />)
    await fill(user)
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    await screen.findByText(/Demasiados intentos/)
    expect((screen.getByRole('button', { name: 'Entrar' }) as HTMLButtonElement).disabled).toBe(false)
  })

  it('links to password recovery and to sign-up', () => {
    render(<SignIn />)
    expect(screen.getByText('¿Olvidaste tu contraseña?').closest('a')?.getAttribute('href')).toBe('/auth/forgot-password')
    expect(screen.getByText('Crear cuenta').closest('a')?.getAttribute('href')).toBe('/auth/sign-up')
  })
})
