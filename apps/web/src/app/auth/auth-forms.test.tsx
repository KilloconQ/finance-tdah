import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

const { signUp, signIn } = vi.hoisted(() => ({ signUp: vi.fn(), signIn: vi.fn() }))
vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (opts: unknown) => ({ options: opts }),
  useNavigate: () => vi.fn(),
  Link: ({ children }: { children: React.ReactNode }) => <a href="#">{children}</a>,
}))
vi.mock('@/lib/auth-client', () => ({
  authClient: { signUp: { email: signUp }, signIn: { email: signIn } },
}))

type RouteMod = { Route: unknown }
const component = (m: RouteMod) =>
  (m.Route as { options: { component: () => React.ReactElement } }).options.component
const SignUp = component(await import('./sign-up'))
const SignIn = component(await import('./sign-in'))

afterEach(() => {
  cleanup()
  signUp.mockReset()
  signIn.mockReset()
})

describe('sign-up form', () => {
  it('explains a short password in Spanish instead of disabling the button', async () => {
    const user = userEvent.setup()
    render(<SignUp />)
    await user.type(screen.getByLabelText('Tu nombre'), 'Ana')
    await user.type(screen.getByLabelText('Correo'), 'ana@correo.com')
    await user.type(screen.getByLabelText('Contraseña'), 'corta')
    const button = screen.getByRole('button', { name: 'Crear cuenta' }) as HTMLButtonElement
    expect(button.disabled).toBe(false)
    await user.click(button)
    expect(screen.getByText(/al menos 8 caracteres/)).toBeTruthy()
    expect(signUp).not.toHaveBeenCalled()
  })

  it('shows a Spanish message for an invalid email, with native validation off', async () => {
    const user = userEvent.setup()
    const { container } = render(<SignUp />)
    expect(container.querySelector('form')?.noValidate).toBe(true)
    await user.type(screen.getByLabelText('Tu nombre'), 'Ana')
    await user.type(screen.getByLabelText('Correo'), 'no-es-correo')
    await user.type(screen.getByLabelText('Contraseña'), 'larga-de-verdad')
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }))
    expect(screen.getByText(/Escribe un correo válido/)).toBeTruthy()
  })
})

describe('sign-in form', () => {
  it('asks for the password in Spanish when it is empty', async () => {
    const user = userEvent.setup()
    render(<SignIn />)
    await user.type(screen.getByLabelText('Correo'), 'ana@correo.com')
    await user.click(screen.getByRole('button', { name: /Entrar/ }))
    expect(screen.getByText('Escribe tu contraseña.')).toBeTruthy()
    expect(signIn).not.toHaveBeenCalled()
  })
})
