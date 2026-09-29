import { describe, expect, it } from 'vitest'
import {
  accountSupportsEnvelopes,
  allocatedCents,
  envelopeAdjustmentError,
  envelopeDeltaCents,
  lockedInEnvelopesCents,
  spendsLockedMoney,
  unassignedCents,
  type EnvelopeAdjustment,
} from './envelope'

const base: EnvelopeAdjustment = {
  accountType: 'debito',
  accountBalanceCents: 10_000,
  otherEnvelopeBalancesCents: [3_000],
  envelopeBalanceCents: 2_000,
  deltaCents: 0,
}
const adjust = (patch: Partial<EnvelopeAdjustment>) => envelopeAdjustmentError({ ...base, ...patch })

describe('allocatedCents / unassignedCents', () => {
  it('sums only positive envelope balances', () => {
    expect(allocatedCents([])).toBe(0)
    expect(allocatedCents([3_000, 2_000])).toBe(5_000)
    expect(allocatedCents([3_000, -1_500])).toBe(3_000)
  })

  it('is what the account holds minus what is set aside', () => {
    expect(unassignedCents(10_000, [3_000, 2_000])).toBe(5_000)
    expect(unassignedCents(10_000, [])).toBe(10_000)
  })

  it('goes negative when the account dropped below what is set aside', () => {
    expect(unassignedCents(4_000, [3_000, 2_000])).toBe(-1_000)
  })
})

describe('accountSupportsEnvelopes', () => {
  it('rejects credit cards only', () => {
    expect(accountSupportsEnvelopes('credito')).toBe(false)
    for (const t of ['debito', 'efectivo', 'wallet', 'ahorro'] as const) {
      expect(accountSupportsEnvelopes(t)).toBe(true)
    }
  })
})

describe('envelopeAdjustmentError', () => {
  it('allows setting aside up to exactly what is unassigned', () => {
    // 10_000 - (3_000 + 2_000) = 5_000 unassigned
    expect(adjust({ deltaCents: 5_000 })).toBeNull()
    expect(adjust({ deltaCents: 5_001 })).toBe('EXCEEDS_UNASSIGNED')
  })

  it('allows releasing down to zero but not below', () => {
    expect(adjust({ deltaCents: -2_000 })).toBeNull()
    expect(adjust({ deltaCents: -2_001 })).toBe('EXCEEDS_ENVELOPE')
  })

  it('checks a new envelope (balance 0) against the unassigned money', () => {
    expect(adjust({ envelopeBalanceCents: 0, otherEnvelopeBalancesCents: [3_000, 2_000], deltaCents: 5_000 })).toBeNull()
    expect(adjust({ envelopeBalanceCents: 0, otherEnvelopeBalancesCents: [3_000, 2_000], deltaCents: 5_001 })).toBe(
      'EXCEEDS_UNASSIGNED',
    )
  })

  it('refuses envelopes on credit cards', () => {
    expect(adjust({ accountType: 'credito', accountBalanceCents: -5_000, deltaCents: 100 })).toBe('CREDIT_ACCOUNT')
  })

  it('lets an overspent envelope be covered back to zero even with nothing unassigned', () => {
    // Account holds exactly what the other envelope has set aside.
    expect(
      adjust({ accountBalanceCents: 3_000, otherEnvelopeBalancesCents: [3_000], envelopeBalanceCents: -1_000, deltaCents: 1_000 }),
    ).toBeNull()
    // …but going above zero needs unassigned money.
    expect(
      adjust({ accountBalanceCents: 3_000, otherEnvelopeBalancesCents: [3_000], envelopeBalanceCents: -1_000, deltaCents: 1_001 }),
    ).toBe('EXCEEDS_UNASSIGNED')
  })

  it('refuses releasing from an overspent envelope', () => {
    expect(adjust({ envelopeBalanceCents: -500, deltaCents: -1 })).toBe('EXCEEDS_ENVELOPE')
  })

  it('still allows releasing when the account is already over-allocated', () => {
    expect(adjust({ accountBalanceCents: 1_000, deltaCents: -500 })).toBeNull()
    expect(adjust({ accountBalanceCents: 1_000, deltaCents: 1 })).toBe('EXCEEDS_UNASSIGNED')
  })
})

describe('envelopeDeltaCents', () => {
  it('only expenses come out of an envelope', () => {
    expect(envelopeDeltaCents('expense', 1_200)).toBe(-1_200)
    expect(envelopeDeltaCents('income', 1_200)).toBe(0)
    expect(envelopeDeltaCents('transfer', 1_200)).toBe(0)
  })
})

describe('lockedInEnvelopesCents', () => {
  const accounts = [
    { id: 'a', balanceCents: 10_000 },
    { id: 'b', balanceCents: 4_000 },
    { id: 'c', balanceCents: -2_000 },
  ]

  it('adds what each account has set aside', () => {
    expect(
      lockedInEnvelopesCents(accounts, [
        { accountId: 'a', balanceCents: 3_000 },
        { accountId: 'a', balanceCents: 2_000 },
        { accountId: 'b', balanceCents: 1_000 },
      ]),
    ).toBe(6_000)
  })

  it('ignores overspent envelopes and caps at what the account holds', () => {
    expect(
      lockedInEnvelopesCents(accounts, [
        { accountId: 'a', balanceCents: -1_500 },
        { accountId: 'b', balanceCents: 6_000 },
        { accountId: 'c', balanceCents: 1_000 },
      ]),
    ).toBe(4_000)
  })

  it('is zero without envelopes', () => {
    expect(lockedInEnvelopesCents(accounts, [])).toBe(0)
  })
})

describe('spendsLockedMoney', () => {
  // $100 in the account, $60 locked in one envelope: $40 free.
  const before = { balanceCents: 10_000, envelopeBalancesCents: [6_000] }

  it('allows spending what is free', () => {
    expect(spendsLockedMoney(before, { balanceCents: 6_000, envelopeBalancesCents: [6_000] })).toBe(false)
  })

  it('refuses spending past what is free', () => {
    expect(spendsLockedMoney(before, { balanceCents: 5_999, envelopeBalancesCents: [6_000] })).toBe(true)
  })

  it('allows paying from the envelope with its own money', () => {
    expect(spendsLockedMoney(before, { balanceCents: 4_000, envelopeBalancesCents: [0] })).toBe(false)
  })

  it('lets an envelope overspend eat free money but not another envelope', () => {
    const two = { balanceCents: 10_000, envelopeBalancesCents: [5_000, 3_000] } // $20 free
    // Pays $70 from the $50 envelope: $20 comes from free money.
    expect(spendsLockedMoney(two, { balanceCents: 3_000, envelopeBalancesCents: [-2_000, 3_000] })).toBe(false)
    // $71 would dip into the other envelope.
    expect(spendsLockedMoney(two, { balanceCents: 2_900, envelopeBalancesCents: [-2_100, 3_000] })).toBe(true)
  })

  it('leaves accounts with nothing set aside alone, even going negative', () => {
    expect(
      spendsLockedMoney({ balanceCents: 1_000, envelopeBalancesCents: [] }, { balanceCents: -500, envelopeBalancesCents: [] }),
    ).toBe(false)
  })

  it('allows moves that do not make an over-allocated account worse', () => {
    const over = { balanceCents: 5_000, envelopeBalancesCents: [6_000] }
    expect(spendsLockedMoney(over, { balanceCents: 5_500, envelopeBalancesCents: [6_000] })).toBe(false)
    expect(spendsLockedMoney(over, { balanceCents: 4_000, envelopeBalancesCents: [5_000] })).toBe(false)
    expect(spendsLockedMoney(over, { balanceCents: 4_999, envelopeBalancesCents: [6_000] })).toBe(true)
  })
})
