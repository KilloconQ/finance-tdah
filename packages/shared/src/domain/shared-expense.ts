export type Share = { userId: string; shareCents: number }

/** Equal split in integer cents; leftover cents go to the first members. */
export function splitEqual(amountCents: number, userIds: string[]): Share[] {
  if (userIds.length === 0) throw new Error('splitEqual needs at least one member')
  const base = Math.floor(amountCents / userIds.length)
  const extra = amountCents - base * userIds.length
  return userIds.map((userId, i) => ({ userId, shareCents: base + (i < extra ? 1 : 0) }))
}

/** True when `splits` is exactly what `splitEqual` would produce for the same people. */
export function isEqualSplit(amountCents: number, splits: Share[]): boolean {
  const equal = new Map(splitEqual(amountCents, splits.map((s) => s.userId)).map((s) => [s.userId, s.shareCents]))
  return splits.every((s) => equal.get(s.userId) === s.shareCents)
}

export type ExpenseForBalance = { paidBy: string; amountCents: number; splits: Share[] }
export type SettlementForBalance = { fromUserId: string; toUserId: string; amountCents: number }

/** Net balance per user: positive = is owed money, negative = owes money. */
export function computeBalances(input: {
  expenses: ExpenseForBalance[]
  settlements: SettlementForBalance[]
}): Record<string, number> {
  const net: Record<string, number> = {}
  const add = (id: string, n: number) => {
    net[id] = (net[id] ?? 0) + n
  }
  for (const e of input.expenses) {
    add(e.paidBy, e.amountCents)
    for (const s of e.splits) add(s.userId, -s.shareCents)
  }
  for (const s of input.settlements) {
    add(s.fromUserId, s.amountCents)
    add(s.toUserId, -s.amountCents)
  }
  return net
}

export type Debt = { from: string; to: string; amountCents: number }

// ponytail: greedy largest-debtor to largest-creditor; not provably minimal for every case, fine for small groups
export function simplifyDebts(balances: Record<string, number>): Debt[] {
  const debtors = Object.entries(balances)
    .filter(([, n]) => n < 0)
    .map(([id, n]) => ({ id, n: -n }))
    .sort((a, b) => b.n - a.n)
  const creditors = Object.entries(balances)
    .filter(([, n]) => n > 0)
    .map(([id, n]) => ({ id, n }))
    .sort((a, b) => b.n - a.n)
  const debts: Debt[] = []
  let i = 0
  let j = 0
  while (i < debtors.length && j < creditors.length) {
    const amountCents = Math.min(debtors[i].n, creditors[j].n)
    debts.push({ from: debtors[i].id, to: creditors[j].id, amountCents })
    debtors[i].n -= amountCents
    creditors[j].n -= amountCents
    if (debtors[i].n === 0) i++
    if (creditors[j].n === 0) j++
  }
  return debts
}
