import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearOnboardingDraft, setOnboardingDraft } from '@/lib/onboarding-draft'

const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }))
vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (opts: unknown) => ({ options: opts }),
  useNavigate: () => navigate,
}))

const { Route } = await import('./goal')
const Goal = (Route as unknown as { options: { component: () => React.ReactElement } }).options.component

const savedDraft = () => JSON.parse(window.localStorage.getItem('finance-tdah:onboarding-draft') ?? 'null')

beforeEach(() => {
  navigate.mockReset()
  window.localStorage.clear()
  clearOnboardingDraft()
})
afterEach(cleanup)

describe('Onboarding › first goal', () => {
  it('offers the four ready-made goals on step 3', () => {
    render(<Goal />)
    expect(screen.getByText('3 / 4')).toBeTruthy()
    for (const name of ['Vacaciones a Oaxaca', 'Laptop nueva', 'Cojín mensual', 'Regalos']) {
      expect(screen.getByRole('button', { name: new RegExp(name) })).toBeTruthy()
    }
  })

  it('saves the first preset by default and continues', async () => {
    render(<Goal />)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Crear frasco' }))

    expect(savedDraft().firstGoal).toEqual({ name: 'Vacaciones a Oaxaca', target: 5000, emoji: '🌵' })
    expect(navigate).toHaveBeenCalledWith({ to: '/onboarding/done' })
  })

  it('saves the preset the user picked', async () => {
    const user = userEvent.setup()
    render(<Goal />)

    await user.click(screen.getByRole('button', { name: /Laptop nueva/ }))
    await user.click(screen.getByRole('button', { name: 'Crear frasco' }))

    expect(savedDraft().firstGoal).toEqual({ name: 'Laptop nueva', target: 30000, emoji: '💻' })
  })

  it('skips the goal with "Después", leaving the draft without one', async () => {
    render(<Goal />)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Después' }))

    expect(navigate).toHaveBeenCalledWith({ to: '/onboarding/done' })
    expect(savedDraft()?.firstGoal).toBeUndefined()
  })

  it('clears a goal saved earlier when the user skips with "Después"', async () => {
    setOnboardingDraft({ firstGoal: { name: 'Laptop nueva', emoji: '💻', target: 30000 } })
    render(<Goal />)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Después' }))

    expect(savedDraft().firstGoal).toBeUndefined()
    expect(navigate).toHaveBeenCalledWith({ to: '/onboarding/done' })
  })

  it('shows the earlier choice when returning to the step', async () => {
    setOnboardingDraft({ firstGoal: { name: 'Laptop nueva', emoji: '💻', target: 30000 } })
    render(<Goal />)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Crear frasco' }))

    expect(savedDraft().firstGoal).toEqual({ name: 'Laptop nueva', target: 30000, emoji: '💻' })
  })
})
