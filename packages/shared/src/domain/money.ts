export function centsToUnits(cents: number): number {
  return cents / 100
}

export function unitsToCents(units: number): number {
  return Math.round(units * 100)
}
