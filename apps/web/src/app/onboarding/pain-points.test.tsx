import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearOnboardingDraft, setOnboardingDraft } from '@/lib/onboarding-draft'

const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }))
vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (opts: unknown) => ({ options: opts }),
  useNavigate: () => navigate,
}))

const { Route } = await import('./pain-points')
const PainPoints = (Route as unknown as { options: { component: () => React.ReactElement } }).options.component

const option = (name: RegExp) => screen.getByRole('button', { name })
const savedPain = () => JSON.parse(window.localStorage.getItem('finance-tdah:onboarding-draft') ?? '{}').pain

beforeEach(() => {
  navigate.mockReset()
  window.localStorage.clear()
  clearOnboardingDraft()
})
afterEach(cleanup)

describe('Onboarding › pain points', () => {
  it('shows step 2 with nothing selected', () => {
    render(<PainPoints />)
    expect(screen.getByText('2 / 4')).toBeTruthy()
    expect(screen.queryByText('✓')).toBeNull()
  })

  it('lets the user pick several and un-pick one, keeping the draft in sync', async () => {
    const user = userEvent.setup()
    render(<PainPoints />)

    await user.click(option(/Gasto de impulso/))
    await user.click(option(/Suscripciones que ya no uso/))
    expect(screen.getAllByText('✓')).toHaveLength(2)
    expect(savedPain()).toEqual(['impulso', 'subs'])

    await user.click(option(/Gasto de impulso/))
    expect(screen.getAllByText('✓')).toHaveLength(1)
    expect(savedPain()).toEqual(['subs'])
  })

  it('shows choices already in the draft, e.g. after coming back from the next step', () => {
    act(() => setOnboardingDraft({ pain: ['pago'] }))
    render(<PainPoints />)
    expect(option(/Pago tarjetas tarde/).textContent).toContain('✓')
    expect(option(/Gasto de impulso/).textContent).not.toContain('✓')
  })

  it('goes on to the goal step even with nothing selected', async () => {
    render(<PainPoints />)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Siguiente' }))
    expect(navigate).toHaveBeenCalledWith({ to: '/onboarding/goal' })
  })

  it('goes back one step with the arrow', async () => {
    render(<PainPoints />)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Volver' }))
    expect(navigate).toHaveBeenCalledWith({ to: '..' })
  })
})
