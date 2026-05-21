import { z } from 'zod'
import { cents } from './common'

export const challengeSchema = z.object({
  id: z.uuid(),
  userId: z.string(),
  name: z.string().min(1).max(80),
  description: z.string().min(1).max(280),
  days: z.number().int().min(1).max(30),
  doneDays: z.number().int().min(0),
  expectedSavingsCents: cents,
  startedAt: z.iso.datetime({ offset: true }),
  completedAt: z.iso.datetime({ offset: true }).nullable(),
  failedAt: z.iso.datetime({ offset: true }).nullable(),
  createdAt: z.iso.datetime({ offset: true }),
})

export const createChallengeSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().min(1).max(280),
  days: z.number().int().min(1).max(30).default(7),
  expectedSavingsCents: cents.default(0),
})

export type ChallengeDTO = z.infer<typeof challengeSchema>
export type CreateChallengeInput = z.infer<typeof createChallengeSchema>
