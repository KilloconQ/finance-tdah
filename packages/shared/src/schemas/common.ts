import { z } from 'zod'

/** Money columns are Postgres `integer` (int32): anything above this overflows and 500s. */
export const MAX_CENTS = 2_147_483_647
const overMax = { error: 'El monto es demasiado grande' }
export const cents = z.number().int().nonnegative().max(MAX_CENTS, overMax)
export const signedCents = z.number().int().min(-MAX_CENTS, overMax).max(MAX_CENTS, overMax)
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
