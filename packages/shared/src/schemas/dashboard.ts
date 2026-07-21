import { z } from 'zod'
import { cents, signedCents } from './common'

export const homeSummarySchema = z.object({
  todayAvailableCents: cents,
  weekSpentCents: cents,
  weekTargetCents: cents,
  netWorthCents: signedCents,
  liquidCents: signedCents,
  jarsCents: cents,
  debtCents: cents,
  greeting: z.string(),
})

export const accountsBreakdownSchema = z.object({
  liquidCents: signedCents,
  jarsCents: cents,
  debtCents: cents,
  netWorthCents: signedCents,
})

export type HomeSummaryDTO = z.infer<typeof homeSummarySchema>
export type AccountsBreakdownDTO = z.infer<typeof accountsBreakdownSchema>
