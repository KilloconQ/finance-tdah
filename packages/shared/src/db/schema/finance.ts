import { relations } from 'drizzle-orm'
import {
  boolean,
  date,
  index,
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

export const expenseKindEnum = pgEnum('expense_kind', ['expense', 'income', 'transfer'])

export const invitationStatusEnum = pgEnum('invitation_status', ['pending', 'declined'])

export const userProfile = pgTable('user_profile', {
  userId: text('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  displayName: text('display_name').notNull(),
  pain: jsonb('pain').$type<string[]>().default([]).notNull(),
  inputPreference: inputPreferenceEnum('input_preference').default('voice').notNull(),
  densityMode: densityModeEnum('density_mode').default('simple').notNull(),
  showBalances: boolean('show_balances').default(true).notNull(),
  weeklyBudgetCents: integer('weekly_budget_cents').default(220000).notNull(),
  // "¿Gastaste algo hoy?" push, sent at this local hour on days with nothing logged.
  dailyReminderEnabled: boolean('daily_reminder_enabled').default(true).notNull(),
  dailyReminderHour: integer('daily_reminder_hour').default(21).notNull(),
  timeZone: text('time_zone').default('America/Mexico_City').notNull(),
  // Local date of the last day the reminder was handled, so it goes out once a day.
  lastDailyReminderOn: date('last_daily_reminder_on'),
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

// A "cajita": money set aside inside one account for a purpose. It moves no
// money — the account balance stays the source of truth — it only earmarks
// part of it. The API keeps the positive envelope balances of an account
// within that account's balance; spending from an envelope can push it
// negative (overspent), which is shown rather than blocked.
export const envelope = pgTable(
  'envelope',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accountId: uuid('account_id')
      .notNull()
      .references(() => financialAccount.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    emoji: text('emoji').notNull(),
    balanceCents: integer('balance_cents').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('envelope_account_idx').on(t.accountId)],
)

export const expense = pgTable('expense', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accountId: uuid('account_id').references(() => financialAccount.id, {
    onDelete: 'set null',
  }),
  toAccountId: uuid('to_account_id').references(() => financialAccount.id, {
    onDelete: 'set null',
  }),
  envelopeId: uuid('envelope_id').references(() => envelope.id, { onDelete: 'set null' }),
  kind: expenseKindEnum('kind').default('expense').notNull(),
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
  lastCheckedAt: date('last_checked_at'),
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

export const pushSubscription = pgTable(
  'push_subscription',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    endpoint: text('endpoint').notNull(),
    p256dh: text('p256dh').notNull(),
    auth: text('auth').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex('push_subscription_endpoint_idx').on(t.endpoint)],
)

export const userRelations = relations(user, ({ one, many }) => ({
  profile: one(userProfile, {
    fields: [user.id],
    references: [userProfile.userId],
  }),
  accounts: many(financialAccount),
  goals: many(goal),
  envelopes: many(envelope),
  expenses: many(expense),
  subscriptions: many(subscription),
  challenges: many(challenge),
  budgets: many(dailyBudget),
  pushSubscriptions: many(pushSubscription),
}))

export const pushSubscriptionRelations = relations(pushSubscription, ({ one }) => ({
  user: one(user, { fields: [pushSubscription.userId], references: [user.id] }),
}))

export const financialAccountRelations = relations(financialAccount, ({ one, many }) => ({
  user: one(user, { fields: [financialAccount.userId], references: [user.id] }),
  expenses: many(expense),
  envelopes: many(envelope),
}))

export const envelopeRelations = relations(envelope, ({ one, many }) => ({
  user: one(user, { fields: [envelope.userId], references: [user.id] }),
  account: one(financialAccount, { fields: [envelope.accountId], references: [financialAccount.id] }),
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
    relationName: 'expense_account',
  }),
  toAccount: one(financialAccount, {
    fields: [expense.toAccountId],
    references: [financialAccount.id],
    relationName: 'expense_to_account',
  }),
  envelope: one(envelope, { fields: [expense.envelopeId], references: [envelope.id] }),
}))

export const subscriptionRelations = relations(subscription, ({ one }) => ({
  user: one(user, { fields: [subscription.userId], references: [user.id] }),
}))

export const challengeRelations = relations(challenge, ({ one }) => ({
  user: one(user, { fields: [challenge.userId], references: [user.id] }),
}))

export const expenseGroup = pgTable('expense_group', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  createdBy: text('created_by')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const expenseGroupMember = pgTable(
  'expense_group_member',
  {
    groupId: uuid('group_id')
      .notNull()
      .references(() => expenseGroup.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    joinedAt: timestamp('joined_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex('expense_group_member_idx').on(t.groupId, t.userId),
    index('expense_group_member_user_idx').on(t.userId),
  ],
)

/**
 * A group member asking an existing account to join. Accepting deletes the row and
 * inserts the membership; declining keeps it as 'declined' so the same group can't
 * keep re-inviting (and re-emailing) someone who said no.
 */
export const expenseGroupInvitation = pgTable(
  'expense_group_invitation',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    groupId: uuid('group_id')
      .notNull()
      .references(() => expenseGroup.id, { onDelete: 'cascade' }),
    invitedBy: text('invited_by')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    inviteeId: text('invitee_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    status: invitationStatusEnum('status').default('pending').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex('expense_group_invitation_idx').on(t.groupId, t.inviteeId),
    index('expense_group_invitation_invitee_idx').on(t.inviteeId),
  ],
)

/**
 * One row per counted "invite someone to Cada Quien" event, so the daily limits hold across
 * restarts and API instances. `scope` is 'sender' (key = inviter's user id, every valid request)
 * or 'address' (key = invited email, only when it has no account). Rows older than a day are
 * swept by the route that writes them, so the table stays small. No FK: it is a ledger of
 * events, not a relation.
 */
export const appInvitationLog = pgTable(
  'app_invitation_log',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    scope: text('scope').notNull(),
    key: text('key').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('app_invitation_log_key_idx').on(t.scope, t.key, t.createdAt),
    index('app_invitation_log_created_idx').on(t.createdAt),
  ],
)

export const sharedExpense = pgTable(
  'shared_expense',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    groupId: uuid('group_id')
      .notNull()
      .references(() => expenseGroup.id, { onDelete: 'cascade' }),
    paidBy: text('paid_by')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    description: text('description').notNull(),
    amountCents: integer('amount_cents').notNull(),
    date: date('date').notNull(),
    createdBy: text('created_by')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('shared_expense_group_idx').on(t.groupId)],
)

export const sharedExpenseSplit = pgTable(
  'shared_expense_split',
  {
    expenseId: uuid('expense_id')
      .notNull()
      .references(() => sharedExpense.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    shareCents: integer('share_cents').notNull(),
  },
  (t) => [uniqueIndex('shared_expense_split_idx').on(t.expenseId, t.userId)],
)

export const settlement = pgTable(
  'settlement',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    groupId: uuid('group_id')
      .notNull()
      .references(() => expenseGroup.id, { onDelete: 'cascade' }),
    fromUserId: text('from_user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    toUserId: text('to_user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    amountCents: integer('amount_cents').notNull(),
    date: date('date').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('settlement_group_idx').on(t.groupId)],
)

export const expenseGroupRelations = relations(expenseGroup, ({ many }) => ({
  members: many(expenseGroupMember),
  expenses: many(sharedExpense),
  settlements: many(settlement),
}))

export const expenseGroupMemberRelations = relations(expenseGroupMember, ({ one }) => ({
  group: one(expenseGroup, { fields: [expenseGroupMember.groupId], references: [expenseGroup.id] }),
  user: one(user, { fields: [expenseGroupMember.userId], references: [user.id] }),
}))

export const sharedExpenseRelations = relations(sharedExpense, ({ many }) => ({
  splits: many(sharedExpenseSplit),
}))

export const sharedExpenseSplitRelations = relations(sharedExpenseSplit, ({ one }) => ({
  expense: one(sharedExpense, {
    fields: [sharedExpenseSplit.expenseId],
    references: [sharedExpense.id],
  }),
}))

export const numericAmount = numeric

export const ENUMS = {
  accountType: accountTypeEnum,
  subscriptionCadence: subscriptionCadenceEnum,
  inputPreference: inputPreferenceEnum,
  densityMode: densityModeEnum,
  expenseKind: expenseKindEnum,
}
