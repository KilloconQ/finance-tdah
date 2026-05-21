import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type {
  Account,
  ChallengeProgress,
  Expense,
  Goal,
  OnboardingState,
  Subscription,
  Tweaks,
} from './types'
import {
  MOCK_ACCOUNTS,
  MOCK_CHALLENGE,
  MOCK_EXPENSES,
  MOCK_GOALS,
  MOCK_SUBSCRIPTIONS,
  TODAY_AVAILABLE,
  WEEK_SPENT,
  WEEK_TARGET,
} from './mockData'

interface AppState {
  tweaks: Tweaks
  setTweak: <K extends keyof Tweaks>(key: K, value: Tweaks[K]) => void

  onboarding: OnboardingState
  setOnboarding: (patch: Partial<OnboardingState>) => void
  completeOnboarding: () => void
  resetOnboarding: () => void

  accounts: Account[]
  goals: Goal[]
  expenses: Expense[]
  subscriptions: Subscription[]
  challenge: ChallengeProgress

  todayAvailable: number
  weekSpent: number
  weekTarget: number

  addExpense: (e: Omit<Expense, 'id' | 'date'>) => void
  addToGoal: (goalId: string, amount: number) => void
  createGoal: (g: Omit<Goal, 'id' | 'current'>) => void
  cancelSubscription: (id: string) => void
  markChallengeDay: () => void
}

const defaultOnboarding: OnboardingState = {
  pain: [],
  inputPreference: 'voice',
  completed: false,
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      tweaks: { density: 'simple', showBalances: true },
      setTweak: (key, value) =>
        set((s) => ({ tweaks: { ...s.tweaks, [key]: value } })),

      onboarding: defaultOnboarding,
      setOnboarding: (patch) =>
        set((s) => ({ onboarding: { ...s.onboarding, ...patch } })),
      completeOnboarding: () =>
        set((s) => ({ onboarding: { ...s.onboarding, completed: true } })),
      resetOnboarding: () => set({ onboarding: defaultOnboarding }),

      accounts: MOCK_ACCOUNTS,
      goals: MOCK_GOALS,
      expenses: MOCK_EXPENSES,
      subscriptions: MOCK_SUBSCRIPTIONS,
      challenge: MOCK_CHALLENGE,

      todayAvailable: TODAY_AVAILABLE,
      weekSpent: WEEK_SPENT,
      weekTarget: WEEK_TARGET,

      addExpense: (e) =>
        set((s) => {
          const newExpense: Expense = {
            ...e,
            id: `e${Date.now()}`,
            date: new Date().toISOString().slice(0, 10),
          }
          return {
            expenses: [newExpense, ...s.expenses],
            todayAvailable: Math.max(0, s.todayAvailable - e.amount),
            weekSpent: s.weekSpent + e.amount,
          }
        }),

      addToGoal: (goalId, amount) =>
        set((s) => ({
          goals: s.goals.map((g) =>
            g.id === goalId
              ? { ...g, current: Math.min(g.target, g.current + amount) }
              : g,
          ),
        })),

      createGoal: (g) =>
        set((s) => ({
          goals: [
            ...s.goals,
            { ...g, id: `g${Date.now()}`, current: 0 },
          ],
        })),

      cancelSubscription: (id) =>
        set((s) => ({
          subscriptions: s.subscriptions.filter((sub) => sub.id !== id),
        })),

      markChallengeDay: () =>
        set((s) => ({
          challenge: {
            ...s.challenge,
            doneDays: Math.min(s.challenge.days, s.challenge.doneDays + 1),
          },
        })),
    }),
    {
      name: 'finance-tdah',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        tweaks: state.tweaks,
        onboarding: state.onboarding,
      }),
    },
  ),
)
