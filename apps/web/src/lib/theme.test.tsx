/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getThemePreference,
  initTheme,
  resolveTheme,
  setThemePreference,
  THEME_COLORS,
  THEME_KEY,
  useThemePreference,
} from './theme'
import html from '../../index.html?raw'

// jsdom has no matchMedia: a controllable stand-in for the OS color scheme.
function mockSystemScheme(initialDark: boolean) {
  let dark = initialDark
  const listeners = new Set<() => void>()
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      get matches() {
        return query.includes('dark') ? dark : !dark
      },
      media: query,
      addEventListener: (_: string, cb: () => void) => listeners.add(cb),
      removeEventListener: (_: string, cb: () => void) => listeners.delete(cb),
    })),
  )
  return {
    setDark(next: boolean) {
      dark = next
      for (const l of listeners) l()
    },
    listenerCount: () => listeners.size,
  }
}

const root = () => document.documentElement

const themeColorMeta = () => document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')

beforeEach(() => {
  document.head.insertAdjacentHTML('beforeend', '<meta name="theme-color" content="#fafaf9">')
  localStorage.clear()
  root().removeAttribute('data-theme')
  root().style.colorScheme = ''
  setThemePreference('system')
  localStorage.clear()
})

afterEach(() => {
  themeColorMeta()?.remove()
  vi.restoreAllMocks()
})

describe('theme preference', () => {
  it('defaults to system', () => {
    mockSystemScheme(false)
    expect(getThemePreference()).toBe('system')
  })

  it('persists the choice in localStorage and reads it back', () => {
    mockSystemScheme(false)
    setThemePreference('dark')
    expect(localStorage.getItem(THEME_KEY)).toBe('dark')
    expect(getThemePreference()).toBe('dark')
  })

  it('falls back to system when the stored value is corrupt', () => {
    mockSystemScheme(false)
    localStorage.setItem(THEME_KEY, '{"oops":')
    expect(getThemePreference()).toBe('system')
    localStorage.setItem(THEME_KEY, 'sepia')
    expect(getThemePreference()).toBe('system')
  })

  it('falls back to system when localStorage throws on read', () => {
    mockSystemScheme(true)
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied')
    })
    expect(getThemePreference()).toBe('system')
    expect(resolveTheme()).toBe('dark')
  })

  it('keeps the choice in memory when localStorage throws on write', () => {
    mockSystemScheme(false)
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied')
    })
    expect(() => setThemePreference('dark')).not.toThrow()
    expect(getThemePreference()).toBe('dark')
    expect(root().dataset.theme).toBe('dark')
  })
})

describe('applying the theme', () => {
  it('light and dark ignore the OS scheme', () => {
    mockSystemScheme(true)
    setThemePreference('light')
    expect(root().dataset.theme).toBe('light')
    expect(root().style.colorScheme).toBe('light')
    setThemePreference('dark')
    expect(root().dataset.theme).toBe('dark')
    expect(root().style.colorScheme).toBe('dark')
  })

  it('system resolves from prefers-color-scheme', () => {
    mockSystemScheme(true)
    setThemePreference('system')
    expect(resolveTheme()).toBe('dark')
    expect(root().dataset.theme).toBe('dark')
  })

  it('resolves to light when matchMedia is unavailable', () => {
    vi.stubGlobal('matchMedia', undefined)
    expect(resolveTheme()).toBe('light')
  })
})

describe('browser chrome color', () => {
  it('keeps <meta name="theme-color"> in sync with the resolved theme', () => {
    mockSystemScheme(false)
    setThemePreference('dark')
    expect(themeColorMeta()?.content).toBe(THEME_COLORS.dark)
    setThemePreference('light')
    expect(themeColorMeta()?.content).toBe(THEME_COLORS.light)
  })

  it('uses the same colors as the --color-bg tokens', () => {
    // Vitest blanks `.css?raw` imports, so read the file (tests run from apps/web).
    const css = readFileSync('src/index.css', 'utf8')
    const light = /--color-bg:\s*(#\w+);/.exec(css)?.[1]
    const dark = /:root\[data-theme='dark'\][^}]*--color-bg:\s*(#\w+);/.exec(css)?.[1]
    expect(THEME_COLORS).toEqual({ light, dark })
  })
})

describe('initTheme', () => {
  it('applies the stored preference right away', () => {
    mockSystemScheme(false)
    localStorage.setItem(THEME_KEY, 'dark')
    const stop = initTheme()
    expect(root().dataset.theme).toBe('dark')
    stop()
  })

  it('follows the OS live while in system mode', () => {
    const os = mockSystemScheme(false)
    const stop = initTheme()
    expect(root().dataset.theme).toBe('light')
    act(() => os.setDark(true))
    expect(root().dataset.theme).toBe('dark')
    expect(root().style.colorScheme).toBe('dark')
    act(() => os.setDark(false))
    expect(root().dataset.theme).toBe('light')
    stop()
  })

  it('ignores OS changes once the user picked light or dark', () => {
    const os = mockSystemScheme(false)
    const stop = initTheme()
    setThemePreference('light')
    act(() => os.setDark(true))
    expect(root().dataset.theme).toBe('light')
    stop()
  })

  it('picks up a change made in another tab', () => {
    mockSystemScheme(false)
    const stop = initTheme()
    localStorage.setItem(THEME_KEY, 'dark')
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: THEME_KEY, newValue: 'dark' }))
    })
    expect(root().dataset.theme).toBe('dark')
    stop()
  })

  it('stops listening after cleanup', () => {
    const os = mockSystemScheme(false)
    const stop = initTheme()
    stop()
    expect(os.listenerCount()).toBe(0)
  })
})

describe('useThemePreference', () => {
  it('re-renders when the preference changes', () => {
    mockSystemScheme(false)
    const { result } = renderHook(() => useThemePreference())
    expect(result.current).toBe('system')
    act(() => setThemePreference('dark'))
    expect(result.current).toBe('dark')
  })
})

// The inline script in index.html is the no-flash guard: it must set the theme
// before React (and the CSS bundle's paint) ever runs.
describe('index.html bootstrap script', () => {
  const script = /<script>([\s\S]*?)<\/script>/.exec(html)?.[1]

  function runBootstrap() {
    new Function(script!)()
  }

  it('exists as an inline classic script in <head>', () => {
    expect(script).toBeTruthy()
    expect(html.indexOf('<script>')).toBeLessThan(html.indexOf('</head>'))
  })

  it('applies a stored dark preference', () => {
    mockSystemScheme(false)
    localStorage.setItem(THEME_KEY, 'dark')
    runBootstrap()
    expect(root().dataset.theme).toBe('dark')
    expect(root().style.colorScheme).toBe('dark')
  })

  it('follows the OS when nothing is stored', () => {
    mockSystemScheme(true)
    runBootstrap()
    expect(root().dataset.theme).toBe('dark')
  })

  it('lets a stored light win over a dark OS', () => {
    mockSystemScheme(true)
    localStorage.setItem(THEME_KEY, 'light')
    runBootstrap()
    expect(root().dataset.theme).toBe('light')
  })

  it('survives unavailable localStorage', () => {
    mockSystemScheme(true)
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied')
    })
    expect(runBootstrap).not.toThrow()
    expect(root().dataset.theme).toBe('dark')
  })

  it('stays in sync with the key used by the store', () => {
    expect(script).toContain(THEME_KEY)
  })

  it('sets the browser chrome color before first paint', () => {
    mockSystemScheme(true)
    runBootstrap()
    expect(themeColorMeta()?.content).toBe(THEME_COLORS.dark)
    localStorage.setItem(THEME_KEY, 'light')
    runBootstrap()
    expect(themeColorMeta()?.content).toBe(THEME_COLORS.light)
  })
})
