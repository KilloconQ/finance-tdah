import { describe, expect, it } from 'vitest'
import webpush from 'web-push'
import { vapidStatus } from './vapid'

const pair = webpush.generateVAPIDKeys()
const other = webpush.generateVAPIDKeys()

const problem = (pub?: string, priv?: string) => {
  const status = vapidStatus(pub, priv)
  return status.enabled ? null : status.problem
}

describe('vapidStatus', () => {
  it('turns push on for a real pair', () => {
    expect(vapidStatus(pair.publicKey, pair.privateKey)).toEqual({ enabled: true })
  })

  it('says which key is missing', () => {
    expect(problem(undefined, undefined)).toMatch(/VAPID keys are not set/)
    expect(problem(pair.publicKey, undefined)).toMatch(/VAPID_PRIVATE_KEY is not set/)
    expect(problem(undefined, pair.privateKey)).toMatch(/VAPID_PUBLIC_KEY is not set/)
  })

  it('catches the private key pasted on the public line', () => {
    // The .env that took push down: VAPID_PUBLIC_KEY= twice, the last one the private key.
    expect(problem(pair.privateKey, pair.privateKey)).toMatch(/VAPID_PUBLIC_KEY is not a valid public key \(43 chars/)
  })

  it('catches swapped keys', () => {
    expect(problem(pair.privateKey, pair.publicKey)).toMatch(/VAPID_PUBLIC_KEY is not a valid public key/)
  })

  it('catches a stray quote, a truncated key and a key from another pair', () => {
    expect(problem(`"${pair.publicKey}"`, pair.privateKey)).toMatch(/not a valid public key/)
    expect(problem(pair.publicKey.slice(0, 60), pair.privateKey)).toMatch(/not a valid public key/)
    expect(problem(pair.publicKey, `'${pair.privateKey}'`)).toMatch(/not a valid private key/)
    expect(problem(pair.publicKey, other.privateKey)).toMatch(/not a pair/)
  })

  it("never lets a bad key reach web-push, which throws while the API loads", () => {
    // What would have run at startup for the pair above.
    expect(() => webpush.setVapidDetails('mailto:a@b.co', pair.privateKey, pair.privateKey)).toThrow(/65 bytes/)
    expect(vapidStatus(pair.privateKey, pair.privateKey).enabled).toBe(false)
  })
})
