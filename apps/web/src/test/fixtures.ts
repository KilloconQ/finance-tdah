import type { EnvelopeDTO, FinancialAccountDTO } from '@finance-tdah/shared/schemas'
import { json } from './fake-api'

export const NOW = '2026-10-05T12:00:00.000Z'

// Valid v4 UUIDs: the response schemas check them.
export const BANK = '11111111-1111-4111-8111-111111111111'
export const CARD = '55555555-5555-4555-8555-555555555555'
export const RENT = '22222222-2222-4222-8222-222222222222'
export const FOOD = '66666666-6666-4666-8666-666666666666'

export const account = (patch: Partial<FinancialAccountDTO> = {}): FinancialAccountDTO => ({
  id: BANK,
  userId: 'u',
  name: 'Débito BBVA',
  type: 'debito',
  institution: null,
  last4: null,
  balanceCents: 1_000_000,
  createdAt: NOW,
  updatedAt: NOW,
  ...patch,
})

export const envelope = (patch: Partial<EnvelopeDTO> = {}): EnvelopeDTO => ({
  id: RENT,
  userId: 'u',
  accountId: BANK,
  name: 'Renta',
  emoji: '🏠',
  balanceCents: 600_000,
  createdAt: NOW,
  updatedAt: NOW,
  ...patch,
})

/** The GET routes every screen that reads the settings (useTweaks) also needs. */
export const profileRoute = { 'GET /profile': () => json({ profile: null }) }
