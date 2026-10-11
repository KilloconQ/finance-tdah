import { useSyncExternalStore } from 'react'

export type ThemePreference = 'system' | 'light' | 'dark'

// Per-device on purpose (not in the profile). Keep in sync with the inline
// bootstrap script in index.html — a test checks the key matches.
export const THEME_KEY = 'finance-tdah:theme'

// Browser chrome (status bar / address bar) color per theme: the --color-bg
// tokens in index.css and the bootstrap script in index.html. A test keeps the
// three in sync. The PWA manifest can't follow the theme: it stays light.
export const THEME_COLORS = { light: '#fafaf9', dark: '#151412' } as const

const PREFERENCES: readonly string[] = ['system', 'light', 'dark']
const DARK_QUERY = '(prefers-color-scheme: dark)'

// Fallback when localStorage is blocked: the choice still holds for this tab.
let memory: ThemePreference = 'system'
const listeners = new Set<() => void>()

export function getThemePreference(): ThemePreference {
  try {
    const raw = window.localStorage.getItem(THEME_KEY)
    return PREFERENCES.includes(raw as string) ? (raw as ThemePreference) : 'system'
  } catch {
    return memory
  }
}

export function resolveTheme(preference: ThemePreference = getThemePreference()): 'light' | 'dark' {
  if (preference !== 'system') return preference
  return window.matchMedia?.(DARK_QUERY).matches ? 'dark' : 'light'
}

function applyTheme() {
  const theme = resolveTheme()
  const root = document.documentElement
  root.dataset.theme = theme
  root.style.colorScheme = theme // native controls and scrollbars follow
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[theme])
}

function notify() {
  for (const l of listeners) l()
}

export function setThemePreference(preference: ThemePreference) {
  memory = preference
  try {
    window.localStorage.setItem(THEME_KEY, preference)
  } catch {
    /* localStorage unavailable — keep in-memory */
  }
  applyTheme()
  notify()
}

// Applies the stored theme and keeps it live: OS changes (system mode only,
// resolveTheme handles that) and edits made from another tab.
export function initTheme(): () => void {
  applyTheme()
  const media = window.matchMedia?.(DARK_QUERY)
  const onChange = () => {
    applyTheme()
    notify()
  }
  const onStorage = (e: StorageEvent) => {
    if (e.key === THEME_KEY || e.key === null) onChange()
  }
  media?.addEventListener('change', onChange)
  window.addEventListener('storage', onStorage)
  return () => {
    media?.removeEventListener('change', onChange)
    window.removeEventListener('storage', onStorage)
  }
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

export function useThemePreference(): ThemePreference {
  return useSyncExternalStore(subscribe, getThemePreference, () => 'system')
}
