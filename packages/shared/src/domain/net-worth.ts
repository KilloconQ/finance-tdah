/**
 * Net worth math, shared by the API dashboard and the web accounts screen.
 *
 * Jars (goals) are intentionally NOT an input here: a jar is mental accounting
 * over money that already sits in a real account, so its balance is already
 * part of `liquidCents`. Adding jar totals on top would double count.
 */

export type AccountBalanceLike = { balanceCents: number }

export type NetWorth = {
  liquidCents: number
  debtCents: number
  netWorthCents: number
}

export function netWorth(accounts: ReadonlyArray<AccountBalanceLike>): NetWorth {
  let liquidCents = 0
  let debtCents = 0

  for (const { balanceCents } of accounts) {
    if (balanceCents >= 0) liquidCents += balanceCents
    else debtCents += -balanceCents
  }

  return { liquidCents, debtCents, netWorthCents: liquidCents - debtCents }
}
