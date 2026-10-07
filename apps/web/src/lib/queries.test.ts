import { beforeEach, describe, expect, it } from 'vitest'
import { z } from 'zod'
import { account, NOW } from '@/test/fixtures'
import { fakeApi, json } from '@/test/fake-api'
import { QueryClient } from '@tanstack/react-query'
import { accountsQuery, activeChallengeQuery, expensesQuery, homeSummaryQuery, mutations, profileQuery } from './queries'

/** Runs a query's fetcher the way TanStack Query would. */
const run = <T>(options: { queryFn?: unknown; queryKey: readonly unknown[] }) =>
  new QueryClient().fetchQuery(options as never) as Promise<T>

const challenge = {
  id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  userId: 'u',
  name: 'Sin café',
  description: 'Una semana sin comprar café fuera',
  days: 7,
  doneDays: 2,
  expectedSavingsCents: 70_000,
  lastCheckedAt: null,
  startedAt: NOW,
  completedAt: null,
  failedAt: null,
  createdAt: NOW,
}

const summary = {
  todayAvailableCents: 31_400,
  weekSpentCents: 120_000,
  weekTargetCents: 220_000,
  netWorthCents: 800_000,
  liquidCents: 1_000_000,
  jarsCents: 400_000,
  debtCents: 200_000,
  greeting: 'Hola, Gaby',
}

let api: ReturnType<typeof fakeApi>
const ok = () => json({ ok: true })

describe('queries', () => {
  beforeEach(() => {
    api = fakeApi({
      'GET /dashboard/home': () => json({ summary }),
      'GET /profile': () => json({ profile: null }),
      'GET /accounts': () => json({ accounts: [account()] }),
      'GET /expenses': () => json({ expenses: [] }),
      'GET /challenges/active': () => json({ challenge }),
    })
  })

  it('each one asks the right endpoint and unwraps the answer', async () => {
    expect(await run(homeSummaryQuery())).toEqual(summary)
    expect(await run(profileQuery())).toBeNull()
    expect(await run(accountsQuery())).toEqual([account()])
    expect(await run(expensesQuery())).toEqual([])
    expect(await run(activeChallengeQuery())).toMatchObject({ name: 'Sin café', doneDays: 2 })
    expect(api.sent.map((r) => `${r.method} ${r.path}`)).toEqual([
      'GET /dashboard/home',
      'GET /profile',
      'GET /accounts',
      'GET /expenses',
      'GET /challenges/active',
    ])
  })

  it('keeps the cache keys the mutations invalidate by', () => {
    expect(homeSummaryQuery().queryKey).toEqual(['dashboard', 'home'])
    expect(profileQuery().queryKey).toEqual(['profile'])
    expect(accountsQuery().queryKey).toEqual(['accounts'])
    expect(expensesQuery().queryKey).toEqual(['expenses'])
    expect(activeChallengeQuery().queryKey).toEqual(['challenges', 'active'])
  })

  it('rejects an answer that does not match the contract instead of showing wrong numbers', async () => {
    fakeApi({ 'GET /accounts': () => json({ accounts: [{ ...account(), balanceCents: 12.5 }] }) })
    await expect(run(accountsQuery())).rejects.toBeInstanceOf(z.ZodError)
  })

  it('a profile saved before the daily reminder existed still loads, with its defaults', async () => {
    fakeApi({
      'GET /profile': () =>
        json({
          profile: {
            userId: 'u',
            displayName: 'Gaby',
            pain: [],
            inputPreference: 'manual',
            densityMode: 'simple',
            showBalances: true,
            weeklyBudgetCents: 220_000,
            onboardingCompleted: true,
            createdAt: NOW,
            updatedAt: NOW,
          },
        }),
    })
    const profile = await run<{ dailyReminderEnabled: boolean; dailyReminderHour: number; timeZone: string }>(profileQuery())
    expect(profile).toMatchObject({ dailyReminderEnabled: true, dailyReminderHour: 21, timeZone: 'America/Mexico_City' })
  })
})

describe('mutations', () => {
  const calls: Array<[string, () => Promise<unknown>, string, string, unknown]> = [
    ['completeOnboarding', () => mutations.completeOnboarding({ displayName: 'Gaby', pain: [], inputPreference: 'manual' }), 'POST', '/profile/onboarding', { displayName: 'Gaby', pain: [], inputPreference: 'manual' }],
    ['updateProfile', () => mutations.updateProfile({ showBalances: false }), 'PATCH', '/profile', { showBalances: false }],
    ['createAccount', () => mutations.createAccount({ name: 'BBVA', type: 'debito', balanceCents: 10_000 }), 'POST', '/accounts', { name: 'BBVA', type: 'debito', balanceCents: 10_000 }],
    ['createExpense', () => mutations.createExpense({ amountCents: 5_000, category: 'café', description: 'Café', kind: 'expense' }), 'POST', '/expenses', { amountCents: 5_000, category: 'café', description: 'Café', kind: 'expense' }],
    ['parseVoice', () => mutations.parseVoice('gasté doscientos en café'), 'POST', '/expenses/voice', { transcript: 'gasté doscientos en café' }],
    ['createChallenge', () => mutations.createChallenge({ name: 'Sin café', description: 'Una semana', days: 7, expectedSavingsCents: 70_000 }), 'POST', '/challenges', { name: 'Sin café', description: 'Una semana', days: 7, expectedSavingsCents: 70_000 }],
    ['checkChallengeDay', () => mutations.checkChallengeDay('abc'), 'POST', '/challenges/abc/check', undefined],
    ['resetChallenge', () => mutations.resetChallenge('abc'), 'POST', '/challenges/abc/reset', undefined],
  ]

  it.each(calls)('%s sends the right request', async (_name, call, method, path, body) => {
    const sent = fakeApi({
      'POST /profile/onboarding': () => json({ profile: {} }, 201),
      'PATCH /profile': () => json({ profile: {} }),
      'POST /accounts': () => json({ account: {} }, 201),
      'POST /expenses': () => json({ expense: {} }, 201),
      'POST /expenses/voice': ok,
      'POST /challenges': () => json({ challenge: {} }, 201),
      'POST /challenges/abc/check': ok,
      'POST /challenges/abc/reset': ok,
    })

    await call()

    expect(sent.sent).toEqual([{ method, path, body }])
  })

  it("surfaces the API's reason when a request is refused", async () => {
    fakeApi({ 'POST /expenses': () => json({ error: 'Ese dinero está bloqueado en tus cajitas' }, 422) })
    await expect(
      mutations.createExpense({ amountCents: 5_000, category: 'café', description: 'Café', kind: 'expense' }),
    ).rejects.toMatchObject({ message: 'Ese dinero está bloqueado en tus cajitas' })
  })
})
