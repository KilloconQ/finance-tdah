import { describe, expect, it } from 'vitest'
import { isValidVapidPrivateKey, isValidVapidPublicKey } from './vapid'

// A throwaway pair generated with web-push for these tests; it signs nothing.
const PUBLIC = 'BEo7r9XxRjwgECDIY7E2bhV8ir_kaEBruBnKMbChmG1r2pztr3YPNyBrqPk3CULr65jTo0pIs6bLZlDPtVPijxo'
const PRIVATE = '8zvDOaI6oxfRmbdneJthstirRo93KBcxy1XCZL2NM3Y'

describe('isValidVapidPublicKey', () => {
  it('accepts a real public key', () => {
    expect(PUBLIC).toHaveLength(87)
    expect(isValidVapidPublicKey(PUBLIC)).toBe(true)
  })

  it('rejects the private key pasted on the public line', () => {
    expect(PRIVATE).toHaveLength(43)
    expect(isValidVapidPublicKey(PRIVATE)).toBe(false)
  })

  it('rejects quotes, spaces, truncation and padding', () => {
    expect(isValidVapidPublicKey(`"${PUBLIC}"`)).toBe(false)
    expect(isValidVapidPublicKey(`${PUBLIC} `)).toBe(false)
    expect(isValidVapidPublicKey(PUBLIC.slice(0, 80))).toBe(false)
    expect(isValidVapidPublicKey(`${PUBLIC}=`)).toBe(false)
    expect(isValidVapidPublicKey('')).toBe(false)
  })

  it('rejects the right size without the uncompressed-point marker', () => {
    expect(isValidVapidPublicKey(`A${PUBLIC.slice(1)}`)).toBe(false)
  })
})

describe('isValidVapidPrivateKey', () => {
  it('accepts a real private key and rejects the public one', () => {
    expect(isValidVapidPrivateKey(PRIVATE)).toBe(true)
    expect(isValidVapidPrivateKey(PUBLIC)).toBe(false)
  })

  it('rejects junk', () => {
    expect(isValidVapidPrivateKey(`'${PRIVATE}'`)).toBe(false)
    expect(isValidVapidPrivateKey('')).toBe(false)
  })
})
