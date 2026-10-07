import { describe, expect, it } from 'vitest'
import { costOverDaysCents, monthlyCostCents, yearlyCostCents } from './subscription'

describe('monthlyCostCents', () => {
  it('keeps a monthly price as is', () => {
    expect(monthlyCostCents(26_900, 'monthly')).toBe(26_900)
  })

  it('takes a twelfth of a yearly price', () => {
    expect(monthlyCostCents(120_000, 'yearly')).toBe(10_000)
  })

  it('rounds to the cent', () => {
    expect(monthlyCostCents(29_900, 'yearly')).toBe(2_492) // 2,491.67
  })
})

describe('yearlyCostCents', () => {
  it('multiplies a monthly price by twelve and leaves a yearly one alone', () => {
    expect(yearlyCostCents(16_900, 'monthly')).toBe(202_800)
    expect(yearlyCostCents(120_000, 'yearly')).toBe(120_000)
  })
})

describe('costOverDaysCents', () => {
  it('prices a monthly plan by 30-day months', () => {
    expect(costOverDaysCents(30_000, 'monthly', 30)).toBe(30_000)
    expect(costOverDaysCents(30_000, 'monthly', 15)).toBe(15_000)
    expect(costOverDaysCents(30_000, 'monthly', 48)).toBe(48_000)
  })

  it('prices a yearly plan by the year, not as if it were monthly', () => {
    expect(costOverDaysCents(36_500, 'yearly', 365)).toBe(36_500)
    // 60 days of a $1,200 plan is ~$197, not $2,400
    expect(costOverDaysCents(120_000, 'yearly', 60)).toBe(19_726)
  })

  it('costs nothing for no days', () => {
    expect(costOverDaysCents(120_000, 'yearly', 0)).toBe(0)
  })
})
