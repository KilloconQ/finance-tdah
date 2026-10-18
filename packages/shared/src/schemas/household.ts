import { z } from 'zod'
import { cents, isoDate } from './common'

const name = z.string().trim().min(1, { error: 'Ponle un nombre' }).max(60)
const userId = z.string().min(1)
const positiveCents = cents.min(1, { error: 'Tiene que ser mayor que cero' })

export const householdSchema = z.object({
  id: z.uuid(),
  name,
  createdBy: z.string(),
  createdAt: z.iso.datetime({ offset: true }),
})

export const createHouseholdSchema = z.object({ name })

export const updateHouseholdSchema = z.object({ name: name.optional() })

/**
 * Mirrors `SplitRequest` in domain/split.ts. The schema only checks the shape; whether the
 * numbers add up to the expense is the domain's job (`computeShares`), because it depends on
 * the amount, and the route also has to check everyone in it is a member of the household.
 */
export const splitRequestSchema = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('equal'), participants: z.array(userId).min(1) }),
  z.object({
    mode: z.literal('shares'),
    weights: z.record(userId, z.number().int().positive()).refine((r) => Object.keys(r).length > 0),
  }),
  z.object({
    mode: z.literal('percent'),
    basisPoints: z.record(userId, z.number().int().positive()).refine((r) => Object.keys(r).length > 0),
  }),
  z.object({
    mode: z.literal('exact'),
    amounts: z.record(userId, cents).refine((r) => Object.keys(r).length > 0),
  }),
])

export const createSharedExpenseSchema = z.object({
  paidByUserId: userId,
  amountCents: positiveCents,
  description: z.string().trim().min(1).max(120),
  category: z.string().trim().min(1).max(40),
  occurredOn: isoDate,
  split: splitRequestSchema,
})

// Redeclared without defaults and not derived with `.partial()`: see CLAUDE.md. When `split`
// or `amountCents` changes the route re-validates the pair against the stored expense.
export const updateSharedExpenseSchema = z.object({
  paidByUserId: userId.optional(),
  amountCents: positiveCents.optional(),
  description: z.string().trim().min(1).max(120).optional(),
  category: z.string().trim().min(1).max(40).optional(),
  occurredOn: isoDate.optional(),
  split: splitRequestSchema.optional(),
})

export const createSettlementSchema = z
  .object({
    fromUserId: userId,
    toUserId: userId,
    amountCents: positiveCents,
    occurredOn: isoDate,
  })
  .refine((s) => s.fromUserId !== s.toUserId, { error: 'No puedes pagarte a ti mismo' })

export type HouseholdDTO = z.infer<typeof householdSchema>
export type CreateHouseholdInput = z.infer<typeof createHouseholdSchema>
export type UpdateHouseholdInput = z.infer<typeof updateHouseholdSchema>
export type SplitRequestInput = z.infer<typeof splitRequestSchema>
export type CreateSharedExpenseInput = z.input<typeof createSharedExpenseSchema>
export type UpdateSharedExpenseInput = z.infer<typeof updateSharedExpenseSchema>
export type CreateSettlementInput = z.infer<typeof createSettlementSchema>
