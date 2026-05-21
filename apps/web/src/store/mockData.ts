import type { Account, ChallengeProgress, Expense, Goal, Subscription } from './types'

export const MOCK_USER = {
  name: 'Ana',
  greeting: '☀️',
}

export const MOCK_ACCOUNTS: Account[] = [
  { id: 'a1', name: 'BBVA Débito', type: 'debito', balance: 8420, institution: 'BBVA', last4: '4521' },
  { id: 'a2', name: 'Mercado Pago', type: 'wallet', balance: 1240, institution: 'MP' },
  { id: 'a3', name: 'Efectivo', type: 'efectivo', balance: 350 },
  { id: 'a4', name: 'Nu Tarjeta', type: 'credito', balance: -2890, institution: 'Nu', last4: '8810' },
  { id: 'a5', name: 'Ahorro vacaciones', type: 'ahorro', balance: 3100, institution: 'BBVA' },
]

export const MOCK_GOALS: Goal[] = [
  { id: 'g1', name: 'Vacaciones', emoji: '🏖️', current: 3100, target: 5000, deadline: '2026-08-15' },
  { id: 'g2', name: 'Nueva lap', emoji: '💻', current: 4200, target: 18000 },
  { id: 'g3', name: 'Curso Figma', emoji: '🎨', current: 800, target: 2500 },
  { id: 'g4', name: 'Fondo zen', emoji: '🌿', current: 1500, target: 10000 },
]

export const MOCK_EXPENSES: Expense[] = [
  { id: 'e1', amount: 89, category: 'café', description: 'Café Cielito', date: '2026-05-17', accountId: 'a1' },
  { id: 'e2', amount: 240, category: 'comida', description: 'Súper', date: '2026-05-16', accountId: 'a1' },
  { id: 'e3', amount: 65, category: 'transporte', description: 'Uber', date: '2026-05-16', accountId: 'a2' },
  { id: 'e4', amount: 320, category: 'comida', description: 'Cena con Lu', date: '2026-05-15', accountId: 'a1' },
  { id: 'e5', amount: 129, category: 'subs', description: 'Apple TV+', date: '2026-05-15' },
  { id: 'e6', amount: 45, category: 'café', description: 'Latte', date: '2026-05-14', accountId: 'a3' },
]

export const MOCK_SUBSCRIPTIONS: Subscription[] = [
  { id: 's1', name: 'Apple TV+', amount: 129, cadence: 'monthly', nextCharge: '2026-06-05', lastOpened: '2026-03-30', category: 'streaming', unused: true },
  { id: 's2', name: 'Spotify', amount: 119, cadence: 'monthly', nextCharge: '2026-06-12', lastOpened: '2026-05-17', category: 'música' },
  { id: 's3', name: 'Notion', amount: 220, cadence: 'monthly', nextCharge: '2026-06-08', lastOpened: '2026-05-16', category: 'productividad' },
  { id: 's4', name: 'Audible', amount: 169, cadence: 'monthly', nextCharge: '2026-06-22', lastOpened: '2026-02-10', category: 'audiolibros', unused: true },
  { id: 's5', name: 'iCloud 200GB', amount: 49, cadence: 'monthly', nextCharge: '2026-06-03', category: 'almacenamiento' },
  { id: 's6', name: 'Netflix', amount: 269, cadence: 'monthly', nextCharge: '2026-06-19', lastOpened: '2026-05-15', category: 'streaming' },
]

export const MOCK_CHALLENGE: ChallengeProgress = {
  id: 'ch1',
  name: 'Café en casa',
  description: 'Toma tu café de la mañana en casa esta semana. Ahorras ~$420.',
  days: 7,
  doneDays: 3,
  startedAt: '2026-05-13',
}

export const TODAY_AVAILABLE = 384
export const WEEK_TARGET = 2200
export const WEEK_SPENT = 1820
