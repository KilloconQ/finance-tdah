import { relations } from 'drizzle-orm'
import {
  boolean,
  date,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { user } from './auth'

export const accountTypeEnum = pgEnum('account_type', [
  'debito',
  'credito',
  'efectivo',
  'wallet',
  'ahorro',
])

export const subscriptionCadenceEnum = pgEnum('subscription_cadence', ['monthly', 'yearly'])

export const inputPreferenceEnum = pgEnum('input_preference', ['voice', 'widget', 'manual'])

export const densityModeEnum = pgEnum('density_mode', ['simple', 'detailed'])

export const userProfile = pgTable('user_profile', {
  userId: text('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  displayName: text('display_name').notNull(),
  pain: jsonb('pain').$type<string[]>().default([]).notNull(),
  inputPreference: inputPreferenceEnum('input_preference').default('voice').notNull(),
  densityMode: densityModeEnum('density_mode').default('simple').notNull(),
  showBalances: boolean('show_balances').default(true).notNull(),
  onboardingCompleted: boolean('onboarding_completed').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const financialAccount = pgTable(
  'financial_account',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    type: accountTypeEnum('type').notNull(),
    institution: text('institution'),
    last4: text('last4'),
    balanceCents: integer('balance_cents').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex('financial_account_user_name_idx').on(t.userId, t.name)],
)

export const goal = pgTable('goal', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  emoji: text('emoji').notNull(),
  targetCents: integer('target_cents').notNull(),
  currentCents: integer('current_cents').default(0).notNull(),
  deadline: date('deadline'),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const expense = pgTable('expense', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accountId: uuid('account_id').references(() => financialAccount.id, {
    onDelete: 'set null',
  }),
  amountCents: integer('amount_cents').notNull(),
  category: text('category').notNull(),
  description: text('description').notNull(),
  occurredAt: timestamp('occurred_at', { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const subscription = pgTable('subscription', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  category: text('category').notNull(),
  amountCents: integer('amount_cents').notNull(),
  cadence: subscriptionCadenceEnum('cadence').default('monthly').notNull(),
  nextChargeAt: date('next_charge_at').notNull(),
  lastOpenedAt: date('last_opened_at'),
  unused: boolean('unused').default(false).notNull(),
  cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const challenge = pgTable('challenge', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description').notNull(),
  days: integer('days').default(7).notNull(),
  doneDays: integer('done_days').default(0).notNull(),
  expectedSavingsCents: integer('expected_savings_cents').default(0).notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  failedAt: timestamp('failed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const dailyBudget = pgTable('daily_budget', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  date: date('date').notNull(),
  availableCents: integer('available_cents').notNull(),
  spentCents: integer('spent_cents').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const userRelations = relations(user, ({ one, many }) => ({
  profile: one(userProfile, {
    fields: [user.id],
    references: [userProfile.userId],
  }),
  accounts: many(financialAccount),
  goals: many(goal),
  expenses: many(expense),
  subscriptions: many(subscription),
  challenges: many(challenge),
  budgets: many(dailyBudget),
}))

export const financialAccountRelations = relations(financialAccount, ({ one, many }) => ({
  user: one(user, { fields: [financialAccount.userId], references: [user.id] }),
  expenses: many(expense),
}))

export const goalRelations = relations(goal, ({ one }) => ({
  user: one(user, { fields: [goal.userId], references: [user.id] }),
}))

export const expenseRelations = relations(expense, ({ one }) => ({
  user: one(user, { fields: [expense.userId], references: [user.id] }),
  account: one(financialAccount, {
    fields: [expense.accountId],
    references: [financialAccount.id],
  }),
}))

export const subscriptionRelations = relations(subscription, ({ one }) => ({
  user: one(user, { fields: [subscription.userId], references: [user.id] }),
}))

export const challengeRelations = relations(challenge, ({ one }) => ({
  user: one(user, { fields: [challenge.userId], references: [user.id] }),
}))

export const numericAmount = numeric

export const ENUMS = {
  accountType: accountTypeEnum,
  subscriptionCadence: subscriptionCadenceEnum,
  inputPreference: inputPreferenceEnum,
  densityMode: densityModeEnum,
}
