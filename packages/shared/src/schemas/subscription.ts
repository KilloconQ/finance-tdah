import { z } from 'zod'
import { cents, isoDate, subscriptionCadenceSchema } from './common'

export const subscriptionSchema = z.object({
  id: z.uuid(),
  userId: z.string(),
  name: z.string().min(1).max(60),
  category: z.string().min(1).max(40),
  amountCents: cents.min(1),
  cadence: subscriptionCadenceSchema,
  nextChargeAt: isoDate,
  lastOpenedAt: isoDate.nullable(),
  unused: z.boolean(),
  cancelledAt: z.iso.datetime({ offset: true }).nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
})

export const createSubscriptionSchema = z.object({
  name: z.string().min(1).max(60),
  category: z.string().min(1).max(40),
  amountCents: cents.min(1),
  cadence: subscriptionCadenceSchema.default('monthly'),
  nextChargeAt: isoDate,
  lastOpenedAt: isoDate.optional(),
})

export const updateSubscriptionSchema = createSubscriptionSchema.partial()

export type SubscriptionDTO = z.infer<typeof subscriptionSchema>
export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>
export type UpdateSubscriptionInput = z.infer<typeof updateSubscriptionSchema>
