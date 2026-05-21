import { z } from 'zod'
import { queryOptions } from '@tanstack/react-query'
import {
  challengeSchema,
  expenseSchema,
  financialAccountSchema,
  goalSchema,
  homeSummarySchema,
  subscriptionSchema,
  userProfileSchema,
  type CreateExpenseInput,
  type CreateGoalInput,
  type CreateSubscriptionInput,
  type CreateChallengeInput,
  type CompleteOnboardingInput,
} from '@finance-tdah/shared/schemas'
import { api, fetchValidated } from './api'

export const homeSummaryQuery = () =>
  queryOptions({
    queryKey: ['dashboard', 'home'],
    queryFn: () =>
      fetchValidated('/dashboard/home', z.object({ summary: homeSummarySchema })).then(
        (r) => r.summary,
      ),
  })

export const profileQuery = () =>
  queryOptions({
    queryKey: ['profile'],
    queryFn: () =>
      fetchValidated(
        '/profile',
        z.object({ profile: userProfileSchema.nullable() }),
      ).then((r) => r.profile),
  })

export const accountsQuery = () =>
  queryOptions({
    queryKey: ['accounts'],
    queryFn: () =>
      fetchValidated(
        '/accounts',
        z.object({ accounts: z.array(financialAccountSchema) }),
      ).then((r) => r.accounts),
  })

export const goalsQuery = () =>
  queryOptions({
    queryKey: ['goals'],
    queryFn: () =>
      fetchValidated('/goals', z.object({ goals: z.array(goalSchema) })).then((r) => r.goals),
  })

export const goalQuery = (id: string) =>
  queryOptions({
    queryKey: ['goals', id],
    queryFn: () =>
      fetchValidated(`/goals/${id}`, z.object({ goal: goalSchema })).then((r) => r.goal),
  })

export const expensesQuery = () =>
  queryOptions({
    queryKey: ['expenses'],
    queryFn: () =>
      fetchValidated('/expenses', z.object({ expenses: z.array(expenseSchema) })).then(
        (r) => r.expenses,
      ),
  })

export const subscriptionsQuery = () =>
  queryOptions({
    queryKey: ['subscriptions'],
    queryFn: () =>
      fetchValidated(
        '/subscriptions',
        z.object({ subscriptions: z.array(subscriptionSchema) }),
      ).then((r) => r.subscriptions),
  })

export const activeChallengeQuery = () =>
  queryOptions({
    queryKey: ['challenges', 'active'],
    queryFn: () =>
      fetchValidated(
        '/challenges/active',
        z.object({ challenge: challengeSchema.nullable() }),
      ).then((r) => r.challenge),
  })

export const mutations = {
  completeOnboarding: (input: CompleteOnboardingInput) =>
    api.post('profile/onboarding', { json: input }).json<{ profile: unknown }>(),

  createAccount: (input: { name: string; type: string; balanceCents: number }) =>
    api.post('accounts', { json: input }).json(),

  createGoal: (input: CreateGoalInput) => api.post('goals', { json: input }).json(),

  addToGoal: (id: string, amountCents: number) =>
    api.post(`goals/${id}/add`, { json: { amountCents } }).json(),

  createExpense: (input: CreateExpenseInput) => api.post('expenses', { json: input }).json(),

  parseVoice: (transcript: string) =>
    api.post('expenses/voice', { json: { transcript } }).json(),

  cancelSubscription: (id: string) => api.post(`subscriptions/${id}/cancel`).json(),

  createSubscription: (input: CreateSubscriptionInput) =>
    api.post('subscriptions', { json: input }).json(),

  createChallenge: (input: CreateChallengeInput) =>
    api.post('challenges', { json: input }).json(),

  checkChallengeDay: (id: string) => api.post(`challenges/${id}/check`).json(),
}
