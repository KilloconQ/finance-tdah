/**
 * Who owes whom inside a household.
 *
 * A balance is never stored. It is derived from the expenses and settlements every
 * time, so editing or deleting one cannot leave a drifting number behind (the same
 * class of bug the account balances had with concurrent edits).
 *
 * Sign convention: positive = the household owes this person, negative = this person owes.
 */

export interface SharedExpenseLike {
  paidByUserId: string
  amountCents: number
  shares: { userId: string; shareCents: number }[]
}

/** `fromUserId` paid `toUserId` to settle up. */
export interface SettlementLike {
  fromUserId: string
  toUserId: string
  amountCents: number
}

export interface Balance {
  userId: string
  balanceCents: number
}

export interface Payment {
  fromUserId: string
  toUserId: string
  amountCents: number
}

const compareIds = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0)

/**
 * Net position of each person. Someone who already left but appears in an old
 * expense is still reported, so the balances keep adding up to zero.
 */
export function computeBalances(
  memberIds: string[],
  expenses: SharedExpenseLike[],
  settlements: SettlementLike[],
): Balance[] {
  const net = new Map<string, number>(memberIds.map((id) => [id, 0]))
  const add = (id: string, delta: number) => net.set(id, (net.get(id) ?? 0) + delta)

  for (const e of expenses) {
    add(e.paidByUserId, e.amountCents)
    for (const s of e.shares) add(s.userId, -s.shareCents)
  }
  for (const s of settlements) {
    add(s.fromUserId, s.amountCents)
    add(s.toUserId, -s.amountCents)
  }

  return [...net.entries()]
    .map(([userId, balanceCents]) => ({ userId, balanceCents }))
    .sort((a, b) => compareIds(a.userId, b.userId))
}

/**
 * The fewest payments that leave everyone at zero (at most n - 1): the biggest debtor
 * pays the biggest creditor until one runs out. Presentation only; the payments people
 * actually make are recorded as settlements.
 */
export function simplifyDebts(balances: Balance[]): Payment[] {
  if (balances.reduce((s, b) => s + b.balanceCents, 0) !== 0) {
    throw new Error('Balances must add up to zero')
  }
  const rank = (a: Balance, b: Balance) =>
    b.balanceCents - a.balanceCents || compareIds(a.userId, b.userId)

  const creditors = balances.filter((b) => b.balanceCents > 0).map((b) => ({ ...b })).sort(rank)
  const debtors = balances
    .filter((b) => b.balanceCents < 0)
    .map((b) => ({ userId: b.userId, balanceCents: -b.balanceCents }))
    .sort(rank)

  const payments: Payment[] = []
  while (creditors.length > 0 && debtors.length > 0) {
    const creditor = creditors[0]
    const debtor = debtors[0]
    const amountCents = Math.min(creditor.balanceCents, debtor.balanceCents)
    payments.push({ fromUserId: debtor.userId, toUserId: creditor.userId, amountCents })
    creditor.balanceCents -= amountCents
    debtor.balanceCents -= amountCents
    if (creditor.balanceCents === 0) creditors.shift()
    if (debtor.balanceCents === 0) debtors.shift()
    creditors.sort(rank)
    debtors.sort(rank)
  }
  return payments
}
