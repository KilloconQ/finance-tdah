import { useSyncExternalStore } from 'react'

export interface OnboardingDraft {
  pain: string[]
  inputPreference: 'voice' | 'widget' | 'manual'
  firstGoal?: { name: string; emoji: string; target: number }
}

const KEY = 'finance-tdah:onboarding-draft'

const DEFAULT: OnboardingDraft = {
  pain: [],
  inputPreference: 'manual',
}

const INPUT_PREFERENCES = ['voice', 'widget', 'manual']

// Stored JSON is untrusted: keep only well-shaped fields, default the rest.
function sanitize(value: unknown): OnboardingDraft {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return DEFAULT
  const v = value as Record<string, unknown>
  const draft: OnboardingDraft = {
    pain: Array.isArray(v.pain) ? v.pain.filter((p): p is string => typeof p === 'string') : [],
    inputPreference: INPUT_PREFERENCES.includes(v.inputPreference as string)
      ? (v.inputPreference as OnboardingDraft['inputPreference'])
      : DEFAULT.inputPreference,
  }
  const g = v.firstGoal as Record<string, unknown> | null | undefined
  if (
    g &&
    typeof g.name === 'string' &&
    typeof g.emoji === 'string' &&
    typeof g.target === 'number' &&
    Number.isFinite(g.target)
  ) {
    draft.firstGoal = { name: g.name, emoji: g.emoji, target: g.target }
  }
  return draft
}

let cached: OnboardingDraft | null = null
const listeners = new Set<() => void>()

function read(): OnboardingDraft {
  if (cached) return cached
  if (typeof window === 'undefined') {
    cached = DEFAULT
    return cached
  }
  try {
    const raw = window.localStorage.getItem(KEY)
    cached = raw ? sanitize(JSON.parse(raw)) : DEFAULT
  } catch {
    cached = DEFAULT
  }
  return cached
}

function notify() {
  for (const l of listeners) l()
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

export function setOnboardingDraft(patch: Partial<OnboardingDraft>) {
  cached = { ...read(), ...patch }
  try {
    window.localStorage.setItem(KEY, JSON.stringify(cached))
  } catch {
    /* localStorage unavailable — keep in-memory */
  }
  notify()
}

export function clearOnboardingDraft() {
  cached = DEFAULT
  try {
    window.localStorage.removeItem(KEY)
  } catch {
    /* noop */
  }
  notify()
}

export function useOnboardingDraft(): OnboardingDraft {
  return useSyncExternalStore(subscribe, read, () => DEFAULT)
}
