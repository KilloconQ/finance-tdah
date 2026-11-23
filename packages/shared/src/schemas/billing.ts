import { z } from 'zod'

export const clientPlatformSchema = z.enum(['web', 'ios'])
export type ClientPlatform = z.infer<typeof clientPlatformSchema>

export const billingStatusSchema = z.object({
  /** False in dev/local: clients must not show a paywall at all. */
  required: z.boolean(),
  hasAccess: z.boolean(),
  access: z.enum(['free', 'allowlist', 'subscribed', 'none']),
})
export type BillingStatusDTO = z.infer<typeof billingStatusSchema>

export const adminStatsSchema = z.object({
  users: z.number(),
  allowlisted: z.number(),
  subscribers: z.number(),
  activeLast7Days: z.number(),
  expensesLast7Days: z.number(),
  onboarded: z.object({ web: z.number(), ios: z.number() }),
  signupsByDay: z.array(z.object({ day: z.string(), count: z.number() })),
})
export type AdminStatsDTO = z.infer<typeof adminStatsSchema>
