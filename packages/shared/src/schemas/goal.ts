import { z } from 'zod'
import { cents, isoDate } from './common'

export const goalSchema = z.object({
  id: z.uuid(),
  userId: z.string(),
  name: z.string().min(1).max(80),
  emoji: z.string().min(1).max(8),
  targetCents: cents,
  currentCents: cents,
  deadline: isoDate.nullable(),
  archivedAt: z.iso.datetime({ offset: true }).nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
})

export const createGoalSchema = z.object({
  name: z.string().min(1).max(80),
  emoji: z.string().min(1).max(8).default('🌿'),
  targetCents: cents,
  deadline: isoDate.optional(),
})

export const updateGoalSchema = createGoalSchema.partial()

export const addToGoalSchema = z.object({
  amountCents: cents.min(1, { error: 'Mínimo $0.01' }),
})

export type GoalDTO = z.infer<typeof goalSchema>
export type CreateGoalInput = z.infer<typeof createGoalSchema>
export type UpdateGoalInput = z.infer<typeof updateGoalSchema>
export type AddToGoalInput = z.infer<typeof addToGoalSchema>
