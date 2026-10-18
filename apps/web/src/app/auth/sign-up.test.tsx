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

const { Route } = await import('./sign-up')
const SignUp = (Route as unknown as { options: { component: () => React.ReactElement } }).options.component

beforeEach(() => {
  navigate.mockReset()
  authClient.signUp.email.mockReset()
})
afterEach(cleanup)

async function fill(user: ReturnType<typeof userEvent.setup>, password = 'long-enough') {
  await user.type(screen.getByLabelText('Tu nombre'), 'Ana')
  await user.type(screen.getByLabelText('Email'), 'ana@example.com')
  await user.type(screen.getByLabelText('Contraseña'), password)
}

const submit = () => screen.getByRole('button', { name: /Crear cuenta/ }) as HTMLButtonElement

describe('Auth › sign-up', () => {
  it('keeps the button disabled while the password is under 8 characters', async () => {
    const user = userEvent.setup()
    render(<SignUp />)
    await fill(user, 'short')
    expect(submit().disabled).toBe(true)

    await user.type(screen.getByLabelText('Contraseña'), '123')
    expect(submit().disabled).toBe(false)
  })

  it('needs a name too', async () => {
    const user = userEvent.setup()
    render(<SignUp />)
    await user.type(screen.getByLabelText('Email'), 'ana@example.com')
    await user.type(screen.getByLabelText('Contraseña'), 'long-enough')
    expect(submit().disabled).toBe(true)
  })

  it('creates the account and continues to onboarding', async () => {
    authClient.signUp.email.mockResolvedValue({ data: {}, error: null })
    const user = userEvent.setup()
    render(<SignUp />)
    await fill(user)
    await user.click(submit())

    expect(authClient.signUp.email).toHaveBeenCalledWith({
      email: 'ana@example.com',
      password: 'long-enough',
      name: 'Ana',
    })
    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: '/onboarding', replace: true }))
  })

  it('explains a duplicate email and does not navigate', async () => {
    authClient.signUp.email.mockResolvedValue({
      data: null,
      error: { status: 422, code: 'USER_ALREADY_EXISTS' },
    })
    const user = userEvent.setup()
    render(<SignUp />)
    await fill(user)
    await user.click(submit())

    expect(await screen.findByText('Ya existe una cuenta con ese email.')).toBeTruthy()
    expect(navigate).not.toHaveBeenCalled()
  })

  it('shows the offline message when the request throws', async () => {
    authClient.signUp.email.mockRejectedValue(new TypeError('Failed to fetch'))
    const user = userEvent.setup()
    render(<SignUp />)
    await fill(user)
    await user.click(submit())

    expect(await screen.findByText(/No pudimos conectar con el servidor/)).toBeTruthy()
  })
})
