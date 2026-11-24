import { z } from 'zod'
import { accountTypeSchema, signedCents, trimmedText } from './common'

// Day of the month a credit card closes its statement / is due. Days 29-31 clamp to short months.
const dayOfMonth = z.number().int().min(1).max(31)

export const financialAccountSchema = z.object({
  id: z.uuid(),
  userId: z.string(),
  name: z.string().min(1).max(60),
  type: accountTypeSchema,
  institution: z.string().max(60).nullable(),
  last4: z
    .string()
    .regex(/^\d{4}$/, { error: 'Solo 4 dígitos' })
    .nullable(),
  // Defaults to null so the web keeps working against an API that predates these fields
  // (web and API do not switch over at the same instant during a deploy).
  cutoffDay: dayOfMonth.nullable().default(null),
  paymentDay: dayOfMonth.nullable().default(null),
  balanceCents: signedCents,
  // Default null for the same deploy-skew reason as the fields above.
  closedAt: z.iso.datetime({ offset: true }).nullable().default(null),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
})

export const createFinancialAccountSchema = financialAccountSchema
  .pick({ type: true, institution: true, last4: true })
  .extend({
    name: trimmedText(60, 'Ponle un nombre'),
    balanceCents: signedCents.default(0),
    institution: z.string().trim().max(60).optional(),
    last4: z
      .string()
      .regex(/^\d{4}$/, { error: 'Solo 4 dígitos' })
      .optional(),
    cutoffDay: dayOfMonth.optional(),
    paymentDay: dayOfMonth.optional(),
  })

// `balanceCents` is redeclared without the create schema's `.default(0)`: Zod 4 applies a
// default even under `.partial()`, so a patch that only renames an account would have
// set its balance to $0.
export const updateFinancialAccountSchema = createFinancialAccountSchema
  .extend({ balanceCents: signedCents, cutoffDay: dayOfMonth.nullable(), paymentDay: dayOfMonth.nullable() })
  .partial()

// Response of GET /accounts/:id/statement (see domain/card-statement.ts).
export const cardStatementSchema = z.object({
  /** The local day the statement was calculated for (in the owner's time zone). */
  today: z.string(),
  cutoffDate: z.string(),
  paymentDate: z.string(),
  dueCents: z.number().int(),
  openPeriodCents: z.number().int(),
  nextCutoffDate: z.string(),
})

export type FinancialAccountDTO = z.infer<typeof financialAccountSchema>
export type CreateFinancialAccountInput = z.infer<typeof createFinancialAccountSchema>
export type UpdateFinancialAccountInput = z.infer<typeof updateFinancialAccountSchema>
