import { describe, expect, it } from 'vitest'
import { registerDeviceSchema, unregisterDeviceSchema } from './push'

const token = 'ab'.repeat(32)

describe('registerDeviceSchema', () => {
  it('accepts an APNs token and the environment it belongs to', () => {
    expect(registerDeviceSchema.parse({ token, environment: 'sandbox' })).toEqual({ token, environment: 'sandbox' })
    expect(registerDeviceSchema.safeParse({ token: token.toUpperCase(), environment: 'production' }).success).toBe(true)
  })

  it('accepts the longer tokens Apple has said may come', () => {
    expect(registerDeviceSchema.safeParse({ token: 'a'.repeat(200), environment: 'production' }).success).toBe(true)
  })

  it('rejects anything that is not a long hex string', () => {
    for (const bad of ['', 'ab', 'z'.repeat(64), `${token} `, 'a'.repeat(401), `${token}/../x`]) {
      expect(registerDeviceSchema.safeParse({ token: bad, environment: 'production' }).success, bad).toBe(false)
    }
  })

  it('requires an environment, so a debug build is never mistaken for production', () => {
    expect(registerDeviceSchema.safeParse({ token }).success).toBe(false)
    expect(registerDeviceSchema.safeParse({ token, environment: 'staging' }).success).toBe(false)
  })
})

describe('unregisterDeviceSchema', () => {
  it('needs only the token', () => {
    expect(unregisterDeviceSchema.safeParse({ token }).success).toBe(true)
    expect(unregisterDeviceSchema.safeParse({ token: 'nope' }).success).toBe(false)
  })
})
