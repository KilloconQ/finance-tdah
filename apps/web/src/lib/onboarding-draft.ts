import { useSyncExternalStore } from 'react'

export interface OnboardingDraft {
  pain: string[]
  inputPreference: 'voice' | 'widget' | 'manual'
  firstGoal?: { name: string; emoji: string; target: number }
}

const KEY = 'finance-tdah:onboarding-draft'

const DEFAULT: OnboardingDraft = {
  pain: [],
  inputPreference: 'voice',
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
    cached = raw ? { ...DEFAULT, ...(JSON.parse(raw) as Partial<OnboardingDraft>) } : DEFAULT
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
