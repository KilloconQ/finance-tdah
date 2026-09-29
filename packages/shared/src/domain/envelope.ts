import type { AccountType } from './account'
import type { MovementKind } from './movement'

/**
 * Envelope ("cajita") rules shared by the API, which enforces them, and the
 * web, which shows the same numbers before the user submits.
 *
 * An envelope earmarks part of one account's balance; no money moves. What
 * the user has set aside is the sum of the envelopes' positive balances — an
 * overspent (negative) envelope doesn't free money, its overspend already
 * came out of the account.
 */

export function allocatedCents(envelopeBalancesCents: readonly number[]): number {
  return envelopeBalancesCents.reduce((acc, b) => acc + Math.max(0, b), 0)
}

/** Money in the account not set aside in any envelope. Negative = over-allocated. */
export function unassignedCents(accountBalanceCents: number, envelopeBalancesCents: readonly number[]): number {
  return accountBalanceCents - allocatedCents(envelopeBalancesCents)
}

/** A credit card's balance is debt, not money the user can set aside. */
export function accountSupportsEnvelopes(type: AccountType): boolean {
  return type !== 'credito'
}

export type EnvelopeAdjustmentError = 'CREDIT_ACCOUNT' | 'EXCEEDS_UNASSIGNED' | 'EXCEEDS_ENVELOPE'

export interface EnvelopeAdjustment {
  accountType: AccountType
  accountBalanceCents: number
  /** Balances of the account's other envelopes (not the one being adjusted). */
  otherEnvelopeBalancesCents: readonly number[]
  /** Balance of the envelope being adjusted; 0 when it is being created. */
  envelopeBalanceCents: number
  /** Positive sets money aside, negative releases it. */
  deltaCents: number
}

/**
 * Whether moving `deltaCents` into (or out of) an envelope is allowed.
 * Setting money aside can't exceed what the account holds; releasing can't
 * take an envelope below zero. Only the user's own moves are checked here —
 * recording a real expense is never blocked (see `envelopeDeltaCents`).
 */
export function envelopeAdjustmentError(a: EnvelopeAdjustment): EnvelopeAdjustmentError | null {
  if (!accountSupportsEnvelopes(a.accountType)) return 'CREDIT_ACCOUNT'
  const after = a.envelopeBalanceCents + a.deltaCents

  if (a.deltaCents < 0) return after < 0 ? 'EXCEEDS_ENVELOPE' : null

  const allocatedAfter = allocatedCents(a.otherEnvelopeBalancesCents) + Math.max(0, after)
  const allocatedBefore = allocatedCents(a.otherEnvelopeBalancesCents) + Math.max(0, a.envelopeBalanceCents)
  // Only a move that grows the allocation needs room for it: covering an
  // overspent envelope back up to zero sets nothing new aside.
  if (allocatedAfter > allocatedBefore && allocatedAfter > a.accountBalanceCents) return 'EXCEEDS_UNASSIGNED'
  return null
}

/**
 * How a movement changes the envelope it was paid from. Only expenses come
 * out of an envelope; spending more than it holds takes it negative instead
 * of being refused, because the money was already spent.
 */
export function envelopeDeltaCents(kind: MovementKind, amountCents: number): number {
  return kind === 'expense' ? -amountCents : 0
}

/**
 * Money locked in envelopes across all accounts: it's still in the account
 * but no longer available to spend on anything else. Per account it can't
 * exceed what the account actually holds — an over-allocated account only
 * locks its real balance.
 */
export function lockedInEnvelopesCents(
  accounts: ReadonlyArray<{ id: string; balanceCents: number }>,
  envelopes: ReadonlyArray<{ accountId: string; balanceCents: number }>,
): number {
  return accounts.reduce((sum, account) => {
    const allocated = allocatedCents(envelopes.filter((e) => e.accountId === account.id).map((e) => e.balanceCents))
    return sum + Math.min(allocated, Math.max(0, account.balanceCents))
  }, 0)
}
