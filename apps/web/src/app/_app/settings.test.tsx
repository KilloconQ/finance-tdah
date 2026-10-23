import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getThemePreference, setThemePreference, THEME_KEY } from '@/lib/theme'

const { push, mutate } = vi.hoisted(() => ({
  push: {
    supported: true,
    configured: true,
    subscribed: true,
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
    error: null as string | null,
    keyError: null as string | null,
  },
  mutate: vi.fn(),
}))

vi.mock('@/lib/use-push-subscription', () => ({ usePushSubscription: () => push }))
vi.mock('@/lib/use-tweaks', () => ({
  useTweaks: () => ({ showBalances: true, weeklyBudgetCents: 220000, dailyReminderEnabled: true, dailyReminderHour: 21 }),
  useSetTweak: () => ({ mutate }),
}))
vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (opts: unknown) => ({ options: opts }),
  useNavigate: () => vi.fn(),
}))
vi.mock('@/components', () => ({
  AppBar: () => null,
  TabBar: () => null,
  PhoneShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Btn: ({ children, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...p}>{children}</button>,
}))

const { Route } = await import('./settings')
const Settings = (Route as unknown as { options: { component: () => React.ReactElement } }).options.component

afterEach(() => {
  cleanup()
  Object.assign(push, { supported: true, subscribed: true, keyError: null })
  mutate.mockReset()
  setThemePreference('system')
  localStorage.clear()
})

function setup() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <Settings />
    </QueryClientProvider>,
  )
  return userEvent.setup()
}

describe('Settings › daily reminder', () => {
  it('lets the user pick the hour, sending the device time zone along', async () => {
    const user = setup()
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    expect(screen.getByRole('switch', { name: 'Recordarme si no anoto nada en el día' }).getAttribute('aria-checked')).toBe(
      'true',
    )
    await user.selectOptions(screen.getByLabelText('A qué hora'), '20')
    expect(mutate).toHaveBeenCalledWith({ dailyReminderHour: 20, timeZone: tz })
    await user.click(screen.getByRole('switch', { name: 'Recordarme si no anoto nada en el día' }))
    expect(mutate).toHaveBeenCalledWith({ dailyReminderEnabled: false, timeZone: tz })
  })

  it('only offers the reminder once notifications are on', () => {
    push.subscribed = false
    setup()
    expect(screen.queryByText('Recordarme si no anoto nada en el día')).toBeNull()
  })

  it("says the app's notification key is invalid instead of offering a toggle that can't work", () => {
    push.keyError = 'La clave de notificaciones de esta versión de la app no es válida'
    setup()
    expect(screen.getByText(/clave de notificaciones de esta versión de la app no es válida/)).toBeTruthy()
    expect(screen.queryByRole('switch', { name: 'Activar notificaciones' })).toBeNull()
  })

  it("explains how to get notifications where the browser can't (iPhone outside the home screen)", () => {
    push.supported = false
    setup()
    expect(screen.queryByRole('switch', { name: 'Activar notificaciones' })).toBeNull()
    expect(screen.getByText(/Agregar a pantalla de inicio/)).toBeTruthy()
  })
})

describe('Settings › theme', () => {
  const choice = (name: string) => screen.getByRole('radio', { name })

  it('offers Sistema, Claro and Oscuro, with Sistema selected by default', () => {
    setup()
    expect(screen.getByRole('radiogroup', { name: 'Tema' })).toBeTruthy()
    expect(screen.getAllByRole('radio').map((r) => r.textContent)).toEqual(['Sistema', 'Claro', 'Oscuro'])
    expect(choice('Sistema').getAttribute('aria-checked')).toBe('true')
    expect(choice('Oscuro').getAttribute('aria-checked')).toBe('false')
  })

  it('applies the chosen theme right away and remembers it on this device', async () => {
    const user = setup()
    await user.click(choice('Oscuro'))
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(localStorage.getItem(THEME_KEY)).toBe('dark')
    expect(choice('Oscuro').getAttribute('aria-checked')).toBe('true')
    expect(choice('Oscuro').className).toContain('ring-1')
    expect(choice('Sistema').getAttribute('aria-checked')).toBe('false')
    await user.click(choice('Claro'))
    expect(document.documentElement.dataset.theme).toBe('light')
    expect(getThemePreference()).toBe('light')
  })

  it('shows the stored preference when the screen opens', () => {
    setThemePreference('light')
    setup()
    expect(choice('Claro').getAttribute('aria-checked')).toBe('true')
  })

  it('keeps the theme out of the profile: no server write', async () => {
    const user = setup()
    await user.click(choice('Oscuro'))
    expect(mutate).not.toHaveBeenCalled()
  })

  it('moves between options with the arrow keys', async () => {
    const user = setup()
    choice('Sistema').focus()
    await user.keyboard('{ArrowRight}')
    expect(choice('Claro').getAttribute('aria-checked')).toBe('true')
    expect(document.activeElement).toBe(choice('Claro'))
  })
})

describe('Settings › delete account', () => {
  it('says what is deleted before the user confirms', async () => {
    const user = setup()
    await user.click(screen.getByRole('button', { name: 'Borrar cuenta' }))
    expect(
      screen.getByText('Se borrarán tu cuenta, tus gastos, metas y suscripciones. No se puede deshacer.'),
    ).toBeTruthy()
  })
})
