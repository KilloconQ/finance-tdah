import { describe, expect, it } from 'vitest'
import { isTabActive, MOBILE_TABS, TABS } from './tabs'

const tab = (to: string) => MOBILE_TABS.find((t) => t.to === to)!

describe('tabs', () => {
  it('keeps the phone bar to four stops and the sidebar complete', () => {
    expect(MOBILE_TABS).toHaveLength(4)
    expect(TABS.map((t) => t.to)).toEqual([
      '/',
      '/transactions',
      '/subscriptions',
      '/accounts',
      '/challenge',
    ])
  })

  it('every sidebar destination is reachable on phones, directly or through "Más"', () => {
    for (const { to } of TABS) {
      expect(MOBILE_TABS.some((t) => isTabActive(t, to))).toBe(true)
    }
    expect(MOBILE_TABS.some((t) => isTabActive(t, '/settings'))).toBe(true)
  })

  it('matches Hoy only on the exact root path', () => {
    expect(isTabActive(tab('/'), '/')).toBe(true)
    expect(isTabActive(tab('/'), '/accounts')).toBe(false)
  })

  it('lights "Más" for the hub and the screens it owns', () => {
    for (const path of ['/more', '/subscriptions', '/subscriptions/new', '/challenge', '/settings']) {
      expect(isTabActive(tab('/more'), path)).toBe(true)
    }
    expect(isTabActive(tab('/more'), '/accounts')).toBe(false)
  })
})
