/**
 * Account balance rules shared by the API and the web account forms.
 */

export type AccountType = 'debito' | 'credito' | 'efectivo' | 'wallet' | 'ahorro'

/**
 * A user enters an account balance as a plain positive amount. Credit cards
 * hold debt, so their balance is stored negative and subtracts from net worth
 * (see domain/net-worth.ts). Every other account type holds money the user has.
 */
export function signedBalanceForType(type: AccountType, magnitudeCents: number): number {
  const magnitude = Math.abs(magnitudeCents)
  // Guard against returning -0 for a zero-balance credit card.
  return type === 'credito' && magnitude !== 0 ? -magnitude : magnitude
}
