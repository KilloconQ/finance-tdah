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

export const createExpenseSchema = z
  .object({
    amountCents: cents.min(1, { error: 'Tiene que ser mayor que cero' }),
    category: z.string().min(1).max(40),
    description: z.string().min(1).max(120),
    accountId: z.uuid().optional(),
    toAccountId: z.uuid().optional(),
    kind: z.enum(['expense', 'income', 'transfer']).default('expense'),
    occurredAt: z.iso.datetime({ offset: true }).optional(),
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

export const voiceTranscriptSchema = z.object({
  transcript: z.string().min(1).max(280),
})

export const parsedVoiceExpenseSchema = createExpenseSchema.extend({
  confidence: z.number().min(0).max(1),
})

export type ExpenseDTO = z.infer<typeof expenseSchema>
export type CreateExpenseInput = z.input<typeof createExpenseSchema>
export type VoiceTranscriptInput = z.infer<typeof voiceTranscriptSchema>
export type ParsedVoiceExpense = z.input<typeof parsedVoiceExpenseSchema>
