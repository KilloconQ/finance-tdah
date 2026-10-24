import { z } from 'zod'
import { cents, signedCents, trimmedText } from './common'

export const envelopeSchema = z.object({
  id: z.uuid(),
  userId: z.string(),
  accountId: z.uuid(),
  name: z.string().min(1).max(60),
  emoji: z.string().min(1).max(8),
  // Negative when more was spent from it than it held.
  balanceCents: signedCents,
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
})

export const createEnvelopeSchema = z.object({
  accountId: z.uuid(),
  name: trimmedText(60, 'Ponle un nombre'),
  emoji: z.string().min(1).max(8).default('📦'),
  amountCents: cents.default(0),
})

export const updateEnvelopeSchema = z.object({
  name: trimmedText(60, 'Ponle un nombre').optional(),
  emoji: z.string().min(1).max(8).optional(),
})

/** Positive sets money aside in the envelope, negative releases it back to the account. */
export const adjustEnvelopeSchema = z.object({
  deltaCents: signedCents.refine((v) => v !== 0, { error: 'El monto no puede ser cero' }),
})

export type EnvelopeDTO = z.infer<typeof envelopeSchema>
export type CreateEnvelopeInput = z.input<typeof createEnvelopeSchema>
export type UpdateEnvelopeInput = z.infer<typeof updateEnvelopeSchema>
export type AdjustEnvelopeInput = z.infer<typeof adjustEnvelopeSchema>
