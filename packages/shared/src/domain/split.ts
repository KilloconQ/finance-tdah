/**
 * How a shared expense is divided between the people in a household.
 *
 * Money is integer cents. Dividing it rarely comes out even, so the equal / shares /
 * percent modes use the largest-remainder method: everyone gets the floor of their
 * exact portion and the cents left over go, one each, to whoever lost the most to
 * the rounding (ties broken by user id). The result always sums to the amount and
 * does not depend on the order the client sent the participants in, so the API and
 * the web compute exactly the same thing.
 *
 * exact never "fixes" a mismatch for the user: amounts that do not add up are an error.
 */

export type SplitRequest =
  | { mode: 'equal'; participants: string[] }
  | { mode: 'shares'; weights: Record<string, number> }
  /** 10000 basis points = 100%. Integers, so there is no float rounding to argue about. */
  | { mode: 'percent'; basisPoints: Record<string, number> }
  | { mode: 'exact'; amounts: Record<string, number> }

export interface ShareCents {
  userId: string
  shareCents: number
}

export type SplitError =
  | 'invalid_total'
  | 'no_participants'
  | 'duplicate_participant'
  | 'invalid_weight'
  | 'invalid_amount'
  | 'percent_not_100'
  | 'sum_mismatch'

export type SplitResult = { ok: true; shares: ShareCents[] } | { ok: false; error: SplitError }

const fail = (error: SplitError): SplitResult => ({ ok: false, error })
const byUserId = (a: ShareCents, b: ShareCents) => (a.userId < b.userId ? -1 : a.userId > b.userId ? 1 : 0)
const isPositiveInt = (n: number) => Number.isSafeInteger(n) && n > 0

function proportional(amountCents: number, weights: [string, number][]): ShareCents[] {
  const total = weights.reduce((s, [, w]) => s + BigInt(w), 0n)
  const amount = BigInt(amountCents)
  const rows = weights
    .map(([userId, w]) => {
      const exact = amount * BigInt(w)
      return { userId, floor: exact / total, remainder: exact % total }
    })
    .sort((a, b) => a.userId.localeCompare(b.userId))

  const assigned = rows.reduce((s, r) => s + r.floor, 0n)
  const leftover = Number(amount - assigned)
  const order = [...rows].sort((a, b) =>
    a.remainder === b.remainder ? a.userId.localeCompare(b.userId) : a.remainder > b.remainder ? -1 : 1,
  )
  const extra = new Set(order.slice(0, leftover).map((r) => r.userId))

  return rows.map((r) => ({ userId: r.userId, shareCents: Number(r.floor) + (extra.has(r.userId) ? 1 : 0) }))
}

export function computeShares(amountCents: number, request: SplitRequest): SplitResult {
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0) return fail('invalid_total')

  switch (request.mode) {
    case 'equal': {
      const ids = request.participants
      if (ids.length === 0) return fail('no_participants')
      if (new Set(ids).size !== ids.length) return fail('duplicate_participant')
      return { ok: true, shares: proportional(amountCents, ids.map((id) => [id, 1])) }
    }
    case 'shares': {
      const entries = Object.entries(request.weights)
      if (entries.length === 0) return fail('no_participants')
      if (!entries.every(([, w]) => isPositiveInt(w))) return fail('invalid_weight')
      return { ok: true, shares: proportional(amountCents, entries) }
    }
    case 'percent': {
      const entries = Object.entries(request.basisPoints)
      if (entries.length === 0) return fail('no_participants')
      if (!entries.every(([, w]) => isPositiveInt(w))) return fail('invalid_weight')
      if (entries.reduce((s, [, w]) => s + w, 0) !== 10_000) return fail('percent_not_100')
      return { ok: true, shares: proportional(amountCents, entries) }
    }
    case 'exact': {
      const entries = Object.entries(request.amounts)
      if (entries.length === 0) return fail('no_participants')
      if (!entries.every(([, n]) => Number.isSafeInteger(n) && n >= 0)) return fail('invalid_amount')
      if (entries.reduce((s, [, n]) => s + n, 0) !== amountCents) return fail('sum_mismatch')
      return {
        ok: true,
        shares: entries.map(([userId, shareCents]) => ({ userId, shareCents })).sort(byUserId),
      }
    }
  }
}
