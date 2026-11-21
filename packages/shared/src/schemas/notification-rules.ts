import { z } from 'zod'

export const alertKindSchema = z.enum(['income', 'card_cutoff', 'card_payment', 'subscription_monthly', 'subscription_yearly'])

/** One rule per kind; every field is required, the PUT replaces the rule (no `.default()` to leak into a partial). */
export const notificationRuleInputSchema = z.object({
  enabled: z.boolean(),
  daysBefore: z.number().int().min(0).max(30),
  hour: z.number().int().min(0).max(23),
})

export const notificationRuleSchema = notificationRuleInputSchema.extend({ kind: alertKindSchema })

export const notificationRulesResponseSchema = z.object({ rules: z.array(notificationRuleSchema) })

export type NotificationRuleDTO = z.infer<typeof notificationRuleSchema>
export type NotificationRuleInput = z.infer<typeof notificationRuleInputSchema>
