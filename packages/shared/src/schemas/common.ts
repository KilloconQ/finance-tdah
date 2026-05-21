import { z } from 'zod'

export const cents = z.number().int().nonnegative()
export const signedCents = z.number().int()
export const isoDate = z.iso.date()
export const isoDateTime = z.iso.datetime({ offset: true })

export const accountTypeSchema = z.enum(['debito', 'credito', 'efectivo', 'wallet', 'ahorro'])
export const subscriptionCadenceSchema = z.enum(['monthly', 'yearly'])
export const inputPreferenceSchema = z.enum(['voice', 'widget', 'manual'])
export const densityModeSchema = z.enum(['simple', 'detailed'])

export const idParamSchema = z.object({ id: z.uuid() })

export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
})

export type Pagination = z.infer<typeof paginationSchema>
