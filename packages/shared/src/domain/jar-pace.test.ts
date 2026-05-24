import { describe, expect, it } from 'vitest'
import { jarPace } from './jar'

const startedAt = new Date('2026-05-01T00:00:00Z')
const deadline = new Date('2026-06-15T00:00:00Z')

describe('jarPace', () => {
  it('returns null when there is no deadline', () => {
    const pace = jarPace({
      currentCents: 100_000,
      targetCents: 500_000,
      startedAt,
      deadline: null,
      now: new Date('2026-05-15T00:00:00Z'),
    })
    expect(pace).toBeNull()
  })

  it('reports ahead when current exceeds the linear expected', () => {
    const pace = jarPace({
      currentCents: 310_000,
      targetCents: 500_000,
      startedAt,
      deadline,
      now: new Date('2026-05-15T00:00:00Z'),
    })
    expect(pace).not.toBeNull()
    expect(pace!.status).toBe('ahead')
    expect(pace!.diffCents).toBeGreaterThan(0)
  })

  it('reports behind when current is below the linear expected', () => {
    const pace = jarPace({
      currentCents: 50_000,
      targetCents: 500_000,
      startedAt,
      deadline,
      now: new Date('2026-06-01T00:00:00Z'),
    })
    expect(pace!.status).toBe('behind')
    expect(pace!.diffCents).toBeLessThan(0)
  })

  it('reports on-track when within ±1% of expected', () => {
    const pace = jarPace({
      currentCents: 250_000,
      targetCents: 500_000,
      startedAt,
      deadline,
      now: new Date('2026-05-23T12:00:00Z'),
    })
    expect(pace!.status).toBe('on-track')
  })

  it('counts days remaining until the deadline', () => {
    const pace = jarPace({
      currentCents: 100_000,
      targetCents: 500_000,
      startedAt,
      deadline,
      now: new Date('2026-05-08T00:00:00Z'),
    })
    expect(pace!.daysRemaining).toBe(38)
  })

  it('clamps expected to target after the deadline passes', () => {
    const pace = jarPace({
      currentCents: 500_000,
      targetCents: 500_000,
      startedAt,
      deadline,
      now: new Date('2026-07-01T00:00:00Z'),
    })
    expect(pace!.expectedCents).toBe(500_000)
    expect(pace!.daysRemaining).toBe(0)
  })
})
