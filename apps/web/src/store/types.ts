export type DensityMode = 'simple' | 'detailed'

export type AccountType = 'debito' | 'credito' | 'efectivo' | 'wallet' | 'ahorro'

export interface Account {
  id: string
  name: string
  type: AccountType
  balance: number
  institution?: string
  last4?: string
}

export interface Goal {
  id: string
  name: string
  emoji: string
  current: number
  target: number
  deadline?: string
}

export interface Expense {
  id: string
  amount: number
  category: string
  description: string
  date: string
  accountId?: string
}

export interface Subscription {
  id: string
  name: string
  amount: number
  cadence: 'monthly' | 'yearly'
  nextCharge: string
  lastOpened?: string
  category: string
  unused?: boolean
}

export interface ChallengeProgress {
  id: string
  name: string
  description: string
  days: number
  doneDays: number
  startedAt: string
}

export interface OnboardingState {
  pain: string[]
  firstGoal?: { name: string; target: number; emoji: string }
  inputPreference: 'voice' | 'widget' | 'manual'
  completed: boolean
}

export interface Tweaks {
  density: DensityMode
  showBalances: boolean
}
