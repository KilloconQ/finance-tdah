import type {
  challenge,
  dailyBudget,
  expense,
  financialAccount,
  goal,
  subscription,
  user,
  userProfile,
} from './db/schema'

export type User = typeof user.$inferSelect
export type UserProfile = typeof userProfile.$inferSelect
export type NewUserProfile = typeof userProfile.$inferInsert

export type FinancialAccount = typeof financialAccount.$inferSelect
export type NewFinancialAccount = typeof financialAccount.$inferInsert

export type Goal = typeof goal.$inferSelect
export type NewGoal = typeof goal.$inferInsert

export type Expense = typeof expense.$inferSelect
export type NewExpense = typeof expense.$inferInsert

export type Subscription = typeof subscription.$inferSelect
export type NewSubscription = typeof subscription.$inferInsert

export type Challenge = typeof challenge.$inferSelect
export type NewChallenge = typeof challenge.$inferInsert

export type DailyBudget = typeof dailyBudget.$inferSelect
export type NewDailyBudget = typeof dailyBudget.$inferInsert

export type AccountType = 'debito' | 'credito' | 'efectivo' | 'wallet' | 'ahorro'
export type SubscriptionCadence = 'monthly' | 'yearly'
export type InputPreference = 'voice' | 'widget' | 'manual'
export type DensityMode = 'simple' | 'detailed'
