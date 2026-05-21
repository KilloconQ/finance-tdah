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

export const wrappedStorySchema = z.object({
  id: z.string(),
  label: z.string(),
  title: z.string(),
  big: z.string(),
  body: z.string(),
  hint: z.string().optional(),
})

export const wrappedSchema = z.object({
  weekLabel: z.string(),
  stories: z.array(wrappedStorySchema),
})

export type HomeSummaryDTO = z.infer<typeof homeSummarySchema>
export type AccountsBreakdownDTO = z.infer<typeof accountsBreakdownSchema>
export type WrappedDTO = z.infer<typeof wrappedSchema>
export type WrappedStoryDTO = z.infer<typeof wrappedStorySchema>
