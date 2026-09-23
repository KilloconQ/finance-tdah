import { z } from 'zod'
import { cents } from './common'

export const expenseSchema = z.object({
  id: z.uuid(),
  userId: z.string(),
  accountId: z.uuid().nullable(),
  toAccountId: z.uuid().nullable(),
  kind: z.enum(['expense', 'income', 'transfer']).default('expense'),
  amountCents: cents.min(1),
  category: z.string().min(1).max(40),
  description: z.string().min(1).max(120),
  occurredAt: z.iso.datetime({ offset: true }),
  createdAt: z.iso.datetime({ offset: true }),
})

// Plain object (no default, no refinement) shared by create and update: a
// refined object can't call `.partial()` in Zod 4 ("cannot be used on object
// schemas containing refinements"), and `kind`'s `.default('expense')` would
// silently resurrect a value on a partial update that never touched `kind` —
// so the base stays free of both and each variant adds what it needs.
const expenseBaseSchema = z.object({
  amountCents: cents.min(1, { error: 'Tiene que ser mayor que cero' }),
  category: z.string().min(1).max(40),
  description: z.string().min(1).max(120),
  accountId: z.uuid().optional(),
  toAccountId: z.uuid().optional(),
  kind: z.enum(['expense', 'income', 'transfer']),
  occurredAt: z.iso.datetime({ offset: true }).optional(),
})

export const createExpenseSchema = expenseBaseSchema
  .extend({
    kind: z.enum(['expense', 'income', 'transfer']).default('expense'),
  })
  .superRefine((data, ctx) => {
    if (data.kind !== 'transfer') return

    if (!data.accountId || !data.toAccountId || data.accountId === data.toAccountId) {
      ctx.addIssue({
        code: 'custom',
        message: 'Elegí dos cuentas distintas para transferir',
        path: ['toAccountId'],
      })
    }
  })

// No `.superRefine()` here on purpose: a partial update can't know whether the
// resulting expense will end up a transfer without the existing row, so the
// transfer invariant (two distinct accounts) is enforced in the route after
// merging the patch with the current record, not at the schema level.
export const updateExpenseSchema = expenseBaseSchema.partial()

export const voiceTranscriptSchema = z.object({
  transcript: z.string().min(1).max(280),
})

export const parsedVoiceExpenseSchema = createExpenseSchema.extend({
  confidence: z.number().min(0).max(1),
})

export type ExpenseDTO = z.infer<typeof expenseSchema>
export type CreateExpenseInput = z.input<typeof createExpenseSchema>
export type UpdateExpenseInput = z.input<typeof updateExpenseSchema>
export type VoiceTranscriptInput = z.infer<typeof voiceTranscriptSchema>
export type ParsedVoiceExpense = z.input<typeof parsedVoiceExpenseSchema>
