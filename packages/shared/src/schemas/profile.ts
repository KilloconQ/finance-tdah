import { z } from 'zod'
import { densityModeSchema, inputPreferenceSchema } from './common'

export const userProfileSchema = z.object({
  userId: z.string(),
  displayName: z.string().min(1).max(60),
  pain: z.array(z.string()),
  inputPreference: inputPreferenceSchema,
  densityMode: densityModeSchema,
  showBalances: z.boolean(),
  onboardingCompleted: z.boolean(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
})

export const completeOnboardingSchema = z.object({
  displayName: z.string().min(1).max(60),
  pain: z.array(z.string()).default([]),
  inputPreference: inputPreferenceSchema.default('voice'),
  firstGoal: z
    .object({
      name: z.string().min(1).max(80),
      emoji: z.string().min(1).max(8),
      targetCents: z.number().int().nonnegative(),
    })
    .optional(),
})

export const updateProfileSchema = userProfileSchema
  .pick({
    displayName: true,
    inputPreference: true,
    densityMode: true,
    showBalances: true,
  })
  .partial()

export type UserProfileDTO = z.infer<typeof userProfileSchema>
export type CompleteOnboardingInput = z.infer<typeof completeOnboardingSchema>
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
