import { z } from 'zod'

/** Money columns are Postgres `integer` (int32): anything above this overflows and 500s. */
export const MAX_CENTS = 2_147_483_647
const overMax = { error: 'El monto es demasiado grande' }
export const cents = z.number().int().nonnegative().max(MAX_CENTS, overMax)
export const signedCents = z.number().int().min(-MAX_CENTS, overMax).max(MAX_CENTS, overMax)
export const isoDate = z.iso.date()
const MIN_DATE = '2000-01-01'
const MAX_YEARS_AHEAD = 10
const badDate = { error: 'Elige una fecha entre 2000 y los próximos 10 años' }
const maxDate = () => {
  const d = new Date()
  d.setFullYear(d.getFullYear() + MAX_YEARS_AHEAD)
  return d.toISOString().slice(0, 10)
}
const inRange = (day: string) => day >= MIN_DATE && day <= maxDate()

/** Input dates: a real calendar day between 2000-01-01 and 10 years ahead. */
export const boundedDate = isoDate.refine(inRange, badDate)
export const boundedDateTime = z.iso.datetime({ offset: true }).refine((v) => inRange(v.slice(0, 10)), badDate)

/** Trimmed, non-empty text: whitespace-only is rejected like an empty string. */
export const trimmedText = (max: number, empty = 'Este campo no puede estar vacío') =>
  z.string().trim().min(1, { error: empty }).max(max)

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
