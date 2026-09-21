export type MovementKind = 'expense' | 'income' | 'transfer'

export function sourceBalanceDeltaCents(kind: MovementKind, amountCents: number): number {
  return kind === 'income' ? amountCents : -amountCents
}
