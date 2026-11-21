import { z } from 'zod'
import { boundedDate, cents, isoDate, trimmedText } from './common'

export const incomeFrequencySchema = z.enum(['once', 'weekly', 'biweekly', 'semimonthly', 'monthly'])

export const incomeSchema = z.object({
  id: z.uuid(),
  userId: z.string(),
  name: z.string().min(1).max(60),
  amountCents: cents.min(1).nullable(),
  frequency: incomeFrequencySchema,
  startsOn: isoDate,
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
})

// No `.default()` anywhere: the update schema is this one made partial, and Zod 4 would apply a default to a patch that never sent the field.
export const createIncomeSchema = z.object({
  name: trimmedText(60, 'Ponle un nombre'),
  amountCents: cents.min(1).nullable().optional(),
  frequency: incomeFrequencySchema,
  startsOn: boundedDate,
})

export const updateIncomeSchema = createIncomeSchema.partial()

const MAX_SPAN_DAYS = 400

/** `GET /calendar?from&to`: a range of at most 400 days. */
export const calendarQuerySchema = z
  .object({ from: isoDate, to: isoDate })
  .refine((q) => q.to >= q.from, { error: 'La fecha final no puede ser antes de la inicial', path: ['to'] })
  .refine((q) => (Date.parse(q.to) - Date.parse(q.from)) / 86_400_000 <= MAX_SPAN_DAYS, {
    error: 'Pide un rango de máximo 400 días',
    path: ['to'],
  })

export const calendarEventSchema = z.object({
  date: isoDate,
  kind: z.enum(['card_payment', 'subscription', 'income']),
  title: z.string(),
  amountCents: cents.nullable(),
  sourceId: z.string(),
})

export const calendarResponseSchema = z.object({
  /** Today in the owner's time zone, so every client marks the same day. */
  today: isoDate,
  events: z.array(calendarEventSchema),
})

export type IncomeDTO = z.infer<typeof incomeSchema>
export type CreateIncomeInput = z.infer<typeof createIncomeSchema>
export type UpdateIncomeInput = z.infer<typeof updateIncomeSchema>
export type CalendarEventDTO = z.infer<typeof calendarEventSchema>
export type CalendarResponse = z.infer<typeof calendarResponseSchema>
