export type JarProgress = {
  fraction: number
  percent: number
  isComplete: boolean
  overflowCents: number
}

export type JarProgressInput = {
  currentCents: number
  targetCents: number
}

export function jarProgress({ currentCents, targetCents }: JarProgressInput): JarProgress {
  if (targetCents <= 0) {
    return { fraction: 0, percent: 0, isComplete: false, overflowCents: 0 }
  }

  const safeCurrent = Math.max(0, currentCents)
  const rawFraction = safeCurrent / targetCents
  const fraction = Math.min(1, rawFraction)
  const percent = fraction * 100
  const overflowCents = Math.max(0, currentCents - targetCents)

  return {
    fraction,
    percent,
    isComplete: safeCurrent >= targetCents,
    overflowCents,
  }
}

export type JarPaceStatus = 'ahead' | 'on-track' | 'behind'

export type JarPace = {
  status: JarPaceStatus
  expectedCents: number
  diffCents: number
  daysRemaining: number
}

export type JarPaceInput = {
  currentCents: number
  targetCents: number
  startedAt: Date | string
  deadline: Date | string | null
  now?: Date
}

const MS_PER_DAY = 1000 * 60 * 60 * 24
const ON_TRACK_BAND = 0.01

export function jarPace({
  currentCents,
  targetCents,
  startedAt,
  deadline,
  now = new Date(),
}: JarPaceInput): JarPace | null {
  if (!deadline) return null

  const start = toDate(startedAt).getTime()
  const end = toDate(deadline).getTime()
  const today = now.getTime()

  if (end <= start) return null

  const elapsed = today - start
  const total = end - start
  const linearProgress = Math.max(0, Math.min(1, elapsed / total))

  const expectedCents = Math.round(targetCents * linearProgress)
  const diffCents = currentCents - expectedCents

  const tolerance = Math.round(targetCents * ON_TRACK_BAND)
  const status: JarPaceStatus =
    diffCents > tolerance ? 'ahead' : diffCents < -tolerance ? 'behind' : 'on-track'

  const daysRemaining = Math.max(0, Math.ceil((end - today) / MS_PER_DAY))

  return { status, expectedCents, diffCents, daysRemaining }
}

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value)
}
