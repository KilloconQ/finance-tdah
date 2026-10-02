import { z } from 'zod'
import { DEFAULT_TIME_ZONE, isValidTimeZone } from '../domain/reminder'
import { cents, densityModeSchema, inputPreferenceSchema } from './common'

const dailyReminderHour = z.number().int().min(0).max(23)
const timeZone = z.string().refine(isValidTimeZone, { error: 'Zona horaria no válida' })

export const userProfileSchema = z.object({
  userId: z.string(),
  displayName: z.string().min(1).max(60),
  pain: z.array(z.string()),
  inputPreference: inputPreferenceSchema,
  densityMode: densityModeSchema,
  showBalances: z.boolean(),
  weeklyBudgetCents: cents,
  // Defaults keep a web build working against an API without these columns
  // (mid-deploy, or after rolling the API back).
  dailyReminderEnabled: z.boolean().default(true),
  dailyReminderHour: dailyReminderHour.default(21),
  timeZone: timeZone.default(DEFAULT_TIME_ZONE),
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
    weeklyBudgetCents: true,
  })
  // Not picked from the response schema: Zod 4 applies `.default()` even under
  // `.partial()`, so every unrelated PATCH would reset them.
  .extend({ dailyReminderEnabled: z.boolean(), dailyReminderHour, timeZone })
  .partial()

export type UserProfileDTO = z.infer<typeof userProfileSchema>
export type CompleteOnboardingInput = z.infer<typeof completeOnboardingSchema>
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
