import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearOnboardingDraft, setOnboardingDraft, useOnboardingDraft } from './onboarding-draft'

const KEY = 'finance-tdah:onboarding-draft'

function Probe() {
  const draft = useOnboardingDraft()
  return <pre data-testid="draft">{JSON.stringify(draft)}</pre>
}
const shown = () => JSON.parse(screen.getByTestId('draft').textContent ?? '')

beforeEach(() => {
  window.localStorage.clear()
  clearOnboardingDraft()
})
afterEach(cleanup)

describe('onboarding draft', () => {
  it('starts empty, preferring manual input', () => {
    render(<Probe />)
    expect(shown()).toEqual({ pain: [], inputPreference: 'manual' })
  })

  it('merges patches, re-renders subscribers and persists to localStorage', () => {
    render(<Probe />)
    act(() => setOnboardingDraft({ pain: ['impulso'] }))
    act(() => setOnboardingDraft({ inputPreference: 'voice' }))

    expect(shown()).toEqual({ pain: ['impulso'], inputPreference: 'voice' })
    expect(JSON.parse(window.localStorage.getItem(KEY) ?? '')).toEqual({ pain: ['impulso'], inputPreference: 'voice' })
  })

  it('resets to the defaults and forgets the stored copy when cleared', () => {
    render(<Probe />)
    act(() => setOnboardingDraft({ pain: ['subs'], firstGoal: { name: 'Laptop nueva', emoji: '💻', target: 30000 } }))
    act(() => clearOnboardingDraft())

    expect(shown()).toEqual({ pain: [], inputPreference: 'manual' })
    expect(window.localStorage.getItem(KEY)).toBeNull()
  })

  it('keeps working in memory when localStorage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    render(<Probe />)
    act(() => setOnboardingDraft({ pain: ['saldo'] }))
    expect(shown().pain).toEqual(['saldo'])
  })

  it('restores a draft saved by an earlier visit, filling in missing fields', async () => {
    window.localStorage.setItem(KEY, JSON.stringify({ pain: ['olvido'] }))
    vi.resetModules()
    const fresh = await import('./onboarding-draft')
    function FreshProbe() {
      return <pre data-testid="draft">{JSON.stringify(fresh.useOnboardingDraft())}</pre>
    }
    render(<FreshProbe />)
    expect(shown()).toEqual({ pain: ['olvido'], inputPreference: 'manual' })
  })

  it('falls back to the defaults when the stored draft is corrupt', async () => {
    window.localStorage.setItem(KEY, '{not json')
    vi.resetModules()
    const fresh = await import('./onboarding-draft')
    function FreshProbe() {
      return <pre data-testid="draft">{JSON.stringify(fresh.useOnboardingDraft())}</pre>
    }
    render(<FreshProbe />)
    expect(shown()).toEqual({ pain: [], inputPreference: 'manual' })
  })

  it.each([
    ['pain is not an array', { pain: 'impulso' }, { pain: [], inputPreference: 'manual' }],
    ['pain holds non-strings', { pain: ['a', 1, null] }, { pain: ['a'], inputPreference: 'manual' }],
    ['inputPreference is invalid', { inputPreference: 'telepathy' }, { pain: [], inputPreference: 'manual' }],
    ['firstGoal target is not finite', { firstGoal: { name: 'x', emoji: 'y', target: 'lots' } }, { pain: [], inputPreference: 'manual' }],
    ['the JSON is not an object', [1, 2], { pain: [], inputPreference: 'manual' }],
  ])('sanitizes a stored draft of the wrong shape when %s', async (_, stored, expected) => {
    window.localStorage.setItem(KEY, JSON.stringify(stored))
    vi.resetModules()
    const fresh = await import('./onboarding-draft')
    function FreshProbe() {
      return <pre data-testid="draft">{JSON.stringify(fresh.useOnboardingDraft())}</pre>
    }
    render(<FreshProbe />)
    expect(shown()).toEqual(expected)
  })
})
