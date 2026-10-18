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

const { Route } = await import('./reset-password')
const ResetPassword = (Route as unknown as { options: { component: () => React.ReactElement } }).options
  .component

const visit = (search: string) => window.history.pushState({}, '', `/auth/reset-password${search}`)

beforeEach(() => {
  navigate.mockReset()
  authClient.resetPassword.mockReset()
})
afterEach(() => {
  cleanup()
  window.history.pushState({}, '', '/')
})

describe('Auth › reset-password', () => {
  it('shows the invalid-link screen when the URL has no token', () => {
    visit('')
    render(<ResetPassword />)
    expect(screen.getByText('Link inválido o vencido.')).toBeTruthy()
    expect(screen.getByText('Pedir link nuevo').closest('a')?.getAttribute('href')).toBe('/auth/forgot-password')
    expect(screen.queryByLabelText('Contraseña nueva')).toBeNull()
  })

  it('keeps the button disabled while the new password is under 8 characters', async () => {
    visit('?token=abc')
    const user = userEvent.setup()
    render(<ResetPassword />)
    const button = screen.getByRole('button', { name: 'Restablecer contraseña' }) as HTMLButtonElement

    await user.type(screen.getByLabelText('Contraseña nueva'), 'short')
    expect(button.disabled).toBe(true)
    await user.type(screen.getByLabelText('Contraseña nueva'), '123')
    expect(button.disabled).toBe(false)
  })

  it('sends the token from the URL with the new password, then goes to sign-in', async () => {
    visit('?token=abc123')
    authClient.resetPassword.mockResolvedValue({ data: {}, error: null })
    const user = userEvent.setup()
    render(<ResetPassword />)
    await user.type(screen.getByLabelText('Contraseña nueva'), 'brand-new-pass')
    await user.click(screen.getByRole('button', { name: 'Restablecer contraseña' }))

    expect(authClient.resetPassword).toHaveBeenCalledWith({ newPassword: 'brand-new-pass', token: 'abc123' })
    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: '/auth/sign-in', replace: true }))
  })

  it('tells the user an expired or used link needs a new one', async () => {
    visit('?token=old')
    authClient.resetPassword.mockResolvedValue({ data: null, error: { status: 400, code: 'INVALID_TOKEN' } })
    const user = userEvent.setup()
    render(<ResetPassword />)
    await user.type(screen.getByLabelText('Contraseña nueva'), 'brand-new-pass')
    await user.click(screen.getByRole('button', { name: 'Restablecer contraseña' }))

    expect(await screen.findByText('El link venció o ya se usó. Pide uno nuevo.')).toBeTruthy()
    expect(navigate).not.toHaveBeenCalled()
  })
})
