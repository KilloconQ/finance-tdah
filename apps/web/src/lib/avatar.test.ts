import { describe, expect, it } from 'vitest'
import { avatarTint } from './avatar'

describe('avatarTint', () => {
  it('gives the same hue to the same name', () => {
    expect(avatarTint('Netflix')).toEqual(avatarTint('Netflix'))
  })

  it('tells different services apart', () => {
    expect(avatarTint('Apple TV+')).not.toEqual(avatarTint('Audible'))
  })

  it('exposes the hue as a CSS variable in 0-359, so the theme picks the lightness', () => {
    for (const name of ['', 'A', 'Spotify', 'Disney+', 'Ñandú']) {
      const hue = Number(Object.values(avatarTint(name))[0])
      expect(Number.isInteger(hue)).toBe(true)
      expect(hue).toBeGreaterThanOrEqual(0)
      expect(hue).toBeLessThan(360)
    }
  })

  it('carries no fixed colors (those live in index.css, per theme)', () => {
    expect(Object.keys(avatarTint('Netflix'))).toEqual(['--avatar-hue'])
  })
})
