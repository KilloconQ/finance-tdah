import { cleanup, render, screen } from '@testing-library/react'
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

const { Route } = await import('./forgot-password')
const ForgotPassword = (Route as unknown as { options: { component: () => React.ReactElement } }).options
  .component

beforeEach(() => {
  authClient.requestPasswordReset.mockReset()
})
afterEach(cleanup)

describe('Auth › forgot-password', () => {
  it('keeps the button disabled until there is an email', async () => {
    render(<ForgotPassword />)
    const send = screen.getByRole('button', { name: 'Enviar link' }) as HTMLButtonElement
    expect(send.disabled).toBe(true)
    await userEvent.setup().type(screen.getByLabelText('Email'), 'ana@example.com')
    expect(send.disabled).toBe(false)
  })

  it('asks for a reset that lands on /auth/reset-password and shows the neutral confirmation', async () => {
    authClient.requestPasswordReset.mockResolvedValue({ data: {}, error: null })
    const user = userEvent.setup()
    render(<ForgotPassword />)
    await user.type(screen.getByLabelText('Email'), 'ana@example.com')
    await user.click(screen.getByRole('button', { name: 'Enviar link' }))

    expect(authClient.requestPasswordReset).toHaveBeenCalledWith({
      email: 'ana@example.com',
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
    expect(await screen.findByText(/Si ese email existe/)).toBeTruthy()
    expect(screen.queryByLabelText('Email')).toBeNull()
  })

  it('surfaces the "email not configured" error instead of the confirmation', async () => {
    authClient.requestPasswordReset.mockResolvedValue({
      data: null,
      error: { status: 503, code: 'PASSWORD_RESET_UNAVAILABLE' },
    })
    const user = userEvent.setup()
    render(<ForgotPassword />)
    await user.type(screen.getByLabelText('Email'), 'ana@example.com')
    await user.click(screen.getByRole('button', { name: 'Enviar link' }))

    expect(await screen.findByText(/El reset por email no está configurado/)).toBeTruthy()
    expect(screen.queryByText(/Si ese email existe/)).toBeNull()
  })

  it('shows the offline message when the request throws', async () => {
    authClient.requestPasswordReset.mockRejectedValue(new TypeError('Failed to fetch'))
    const user = userEvent.setup()
    render(<ForgotPassword />)
    await user.type(screen.getByLabelText('Email'), 'ana@example.com')
    await user.click(screen.getByRole('button', { name: 'Enviar link' }))

    expect(await screen.findByText(/No pudimos conectar con el servidor/)).toBeTruthy()
  })
})
