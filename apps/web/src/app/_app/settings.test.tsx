import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'

const { push, mutate } = vi.hoisted(() => ({
  push: {
    supported: true,
    configured: true,
    subscribed: true,
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
    error: null as string | null,
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
  Object.assign(push, { supported: true, subscribed: true })
  mutate.mockReset()
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

  it("explains how to get notifications where the browser can't (iPhone outside the home screen)", () => {
    push.supported = false
    setup()
    expect(screen.queryByRole('switch', { name: 'Activar notificaciones' })).toBeNull()
    expect(screen.getByText(/Agregar a pantalla de inicio/)).toBeTruthy()
  })
})
