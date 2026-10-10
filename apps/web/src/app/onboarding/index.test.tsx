import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }))
vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (opts: unknown) => ({ options: opts }),
  useNavigate: () => navigate,
}))

const { Route } = await import('./index')
const Welcome = (Route as unknown as { options: { component: () => React.ReactElement } }).options.component

beforeEach(() => navigate.mockReset())
afterEach(cleanup)

describe('Onboarding › welcome', () => {
  it('introduces the app as step 1', () => {
    render(<Welcome />)
    expect(screen.getByRole('heading', { name: /Tus finanzas,\s*sin la pereza/ })).toBeTruthy()
    expect(screen.getByText('1 / 4')).toBeTruthy()
  })

  it('moves on to the pain points question', async () => {
    render(<Welcome />)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Empezar' }))
    expect(navigate).toHaveBeenCalledWith({ to: '/onboarding/pain-points' })
  })
})
