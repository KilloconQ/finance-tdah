import { z } from 'zod'
import { cents } from './common'

export const expenseSchema = z.object({
  id: z.uuid(),
  userId: z.string(),
  accountId: z.uuid().nullable(),
  amountCents: cents.min(1),
  category: z.string().min(1).max(40),
  description: z.string().min(1).max(120),
  occurredAt: z.iso.datetime({ offset: true }),
  createdAt: z.iso.datetime({ offset: true }),
})

export const createExpenseSchema = z.object({
  amountCents: cents.min(1, { error: 'Tiene que ser mayor que cero' }),
  category: z.string().min(1).max(40),
  description: z.string().min(1).max(120),
  accountId: z.uuid().optional(),
  occurredAt: z.iso.datetime({ offset: true }).optional(),
})

export const voiceTranscriptSchema = z.object({
  transcript: z.string().min(1).max(280),
})

export const parsedVoiceExpenseSchema = createExpenseSchema.extend({
  confidence: z.number().min(0).max(1),
})

export type ExpenseDTO = z.infer<typeof expenseSchema>
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>
export type VoiceTranscriptInput = z.infer<typeof voiceTranscriptSchema>
export type ParsedVoiceExpense = z.infer<typeof parsedVoiceExpenseSchema>
