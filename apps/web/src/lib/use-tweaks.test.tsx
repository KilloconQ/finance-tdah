import { createElement, type ReactNode } from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'
import { NOW } from '@/test/fixtures'
import { fakeApi, json } from '@/test/fake-api'
import { useSetTweak, useTweaks } from './use-tweaks'

const profile = {
  userId: 'u',
  displayName: 'Gaby',
  pain: [],
  inputPreference: 'manual',
  densityMode: 'simple',
  showBalances: true,
  weeklyBudgetCents: 180_000,
  dailyReminderEnabled: true,
  dailyReminderHour: 20,
  timeZone: 'America/Mexico_City',
  onboardingCompleted: true,
  createdAt: NOW,
  updatedAt: NOW,
}

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client }, children)
  return { client, wrapper }
}

describe('useTweaks', () => {
  it('uses sensible defaults until the profile loads, and when there is none', async () => {
    fakeApi({ 'GET /profile': () => json({ profile: null }) })
    const { wrapper } = setup()
    const { result } = renderHook(() => useTweaks(), { wrapper })

    expect(result.current).toEqual({
      showBalances: true,
      weeklyBudgetCents: 220_000,
      inputPreference: 'voice',
      dailyReminderEnabled: true,
      dailyReminderHour: 21,
    })
  })

  it("reads the user's own settings from the profile", async () => {
    fakeApi({ 'GET /profile': () => json({ profile: { ...profile, showBalances: false } }) })
    const { wrapper } = setup()
    const { result } = renderHook(() => useTweaks(), { wrapper })

    await waitFor(() => expect(result.current.showBalances).toBe(false))
    expect(result.current).toMatchObject({ weeklyBudgetCents: 180_000, inputPreference: 'manual', dailyReminderHour: 20 })
  })
})

describe('useSetTweak', () => {
  it('shows the change at once, before the server answers, then settles on what the server has', async () => {
    let release: (() => void) | undefined
    let stored = { ...profile }
    const api = fakeApi({
      'GET /profile': () => json({ profile: stored }),
      'PATCH /profile': (req) =>
        new Promise<Response>((resolve) => {
          release = () => {
            stored = { ...stored, ...(req.body as object) }
            resolve(json({ profile: stored }))
          }
        }),
    })
    const { wrapper } = setup()
    const { result } = renderHook(() => ({ tweaks: useTweaks(), set: useSetTweak() }), { wrapper })
    await waitFor(() => expect(result.current.tweaks.weeklyBudgetCents).toBe(180_000))

    act(() => result.current.set.mutate({ weeklyBudgetCents: 250_000 }))

    // Optimistic: already on screen while the PATCH is still in flight.
    await waitFor(() => expect(result.current.tweaks.weeklyBudgetCents).toBe(250_000))
    expect(api.writes()).toHaveLength(1)
    expect(api.writes()[0]).toMatchObject({ method: 'PATCH', path: '/profile', body: { weeklyBudgetCents: 250_000 } })

    await waitFor(() => expect(release).toBeTypeOf('function'))
    release!()
    await waitFor(() => expect(result.current.set.isSuccess).toBe(true))
    await waitFor(() => expect(result.current.tweaks.weeklyBudgetCents).toBe(250_000))
  })

  it('puts the old value back at once when the server refuses the change', async () => {
    let gets = 0
    fakeApi({
      // The reload that follows never answers, so only the rollback can restore the value.
      'GET /profile': () => (++gets === 1 ? json({ profile }) : new Promise<Response>(() => {})),
      'PATCH /profile': () => json({ error: 'No se pudo' }, 500),
    })
    const { wrapper } = setup()
    const { result } = renderHook(() => ({ tweaks: useTweaks(), set: useSetTweak() }), { wrapper })
    await waitFor(() => expect(result.current.tweaks.showBalances).toBe(true))

    act(() => result.current.set.mutate({ showBalances: false }))

    await waitFor(() => expect(result.current.set.isError).toBe(true))
    expect(result.current.tweaks.showBalances).toBe(true)
  })

  it('reloads the profile afterwards, so the screen shows what the server really kept', async () => {
    const api = fakeApi({
      'GET /profile': () => json({ profile }),
      'PATCH /profile': () => json({ profile }),
    })
    const { wrapper } = setup()
    const { result } = renderHook(() => ({ tweaks: useTweaks(), set: useSetTweak() }), { wrapper })
    await waitFor(() => expect(result.current.tweaks.showBalances).toBe(true))

    act(() => result.current.set.mutate({ showBalances: false }))

    await waitFor(() => expect(api.sent.filter((r) => r.method === 'GET')).toHaveLength(2))
  })
})
