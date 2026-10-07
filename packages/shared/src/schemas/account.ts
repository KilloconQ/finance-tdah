import { z } from 'zod'
import { accountTypeSchema, signedCents } from './common'

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
  balanceCents: signedCents,
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
})

export const createFinancialAccountSchema = financialAccountSchema
  .pick({ name: true, type: true, institution: true, last4: true })
  .extend({
    balanceCents: signedCents.default(0),
    institution: z.string().max(60).optional(),
    last4: z
      .string()
      .regex(/^\d{4}$/, { error: 'Solo 4 dígitos' })
      .optional(),
  })

// `balanceCents` is redeclared without the create schema's `.default(0)`: Zod 4 applies a
// default even under `.partial()`, so a patch that only renames an account would have
// set its balance to $0.
export const updateFinancialAccountSchema = createFinancialAccountSchema
  .extend({ balanceCents: signedCents })
  .partial()

export type FinancialAccountDTO = z.infer<typeof financialAccountSchema>
export type CreateFinancialAccountInput = z.infer<typeof createFinancialAccountSchema>
export type UpdateFinancialAccountInput = z.infer<typeof updateFinancialAccountSchema>
