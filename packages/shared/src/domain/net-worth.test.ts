import { describe, expect, it } from 'vitest'
import { netWorth } from './net-worth'

describe('netWorth', () => {
  it('returns zeros for no accounts', () => {
    expect(netWorth([])).toEqual({ liquidCents: 0, debtCents: 0, netWorthCents: 0 })
  })

  it('sums positive balances as liquid, net worth equals liquid when no debt', () => {
    const result = netWorth([{ balanceCents: 842_000 }, { balanceCents: 124_000 }])
    expect(result).toEqual({ liquidCents: 966_000, debtCents: 0, netWorthCents: 966_000 })
  })

  it('treats negative balances as debt and subtracts them', () => {
    const result = netWorth([{ balanceCents: -289_000 }])
    expect(result).toEqual({ liquidCents: 0, debtCents: 289_000, netWorthCents: -289_000 })
  })

  it('counts a zero balance as liquid, not debt', () => {
    expect(netWorth([{ balanceCents: 0 }])).toEqual({
      liquidCents: 0,
      debtCents: 0,
      netWorthCents: 0,
    })
  })

  it('does not double count jar money living inside accounts (seed scenario)', () => {
    // Accounts include the "Ahorro vacaciones" account (310_000) that holds the
    // Vacaciones jar — net worth must NOT add jar balances on top of liquid.
    const result = netWorth([
      { balanceCents: 842_000 },
      { balanceCents: 124_000 },
      { balanceCents: 35_000 },
      { balanceCents: -289_000 },
      { balanceCents: 310_000 },
    ])
    expect(result).toEqual({
      liquidCents: 1_311_000,
      debtCents: 289_000,
      netWorthCents: 1_022_000,
    })
  })
})
