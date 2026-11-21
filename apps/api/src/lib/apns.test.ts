import { generateKeyPairSync, verify } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { apnsStatus, createApnsJwt } from './apns'

const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' })
const pem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString()
const good = { keyId: 'ABC123DEFG', teamId: 'TEAM123456', bundleId: 'app.cadaquien.ios', privateKey: pem }

describe('apnsStatus', () => {
  it('is on for a complete, valid set', () => {
    const status = apnsStatus(good)
    expect(status.enabled).toBe(true)
  })

  it('accepts the key with literal \\n, the way hosting dashboards store it', () => {
    expect(apnsStatus({ ...good, privateKey: pem.trim().replace(/\n/g, '\\n') }).enabled).toBe(true)
  })

  it('stays quiet when nothing is set: a web-only install never asked for native push', () => {
    const status = apnsStatus({})
    expect(status).toMatchObject({ enabled: false, configured: false })
  })

  it('names what is missing in a half-done setup', () => {
    const status = apnsStatus({ keyId: 'ABC123DEFG' })
    expect(status).toMatchObject({ enabled: false, configured: true })
    expect((status as { problem: string }).problem).toBe('Falta APNS_TEAM_ID, APNS_PRIVATE_KEY, APNS_BUNDLE_ID.')
  })

  it('rejects ids that are not Apple ids', () => {
    expect((apnsStatus({ ...good, keyId: 'short' }) as { problem: string }).problem).toMatch(/APNS_KEY_ID/)
    expect((apnsStatus({ ...good, teamId: 'lower12345' }) as { problem: string }).problem).toMatch(/APNS_TEAM_ID/)
  })

  it('rejects a key that is not a private key', () => {
    expect((apnsStatus({ ...good, privateKey: 'not a key' }) as { problem: string }).problem).toMatch(/clave privada válida/)
  })

  it('rejects a key on the wrong curve', () => {
    const wrong = generateKeyPairSync('ec', { namedCurve: 'secp384r1' }).privateKey.export({ type: 'pkcs8', format: 'pem' }).toString()
    expect((apnsStatus({ ...good, privateKey: wrong }) as { problem: string }).problem).toMatch(/P-256/)
  })

  it('rejects an RSA key', () => {
    const rsa = generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey.export({ type: 'pkcs8', format: 'pem' }).toString()
    expect(apnsStatus({ ...good, privateKey: rsa }).enabled).toBe(false)
  })
})

describe('createApnsJwt', () => {
  const status = apnsStatus(good)
  if (!status.enabled) throw new Error('fixture must be valid')

  it('carries the key id and team id Apple asks for', () => {
    const [header, claims] = createApnsJwt(status.config, 1_700_000_000).split('.')
    expect(JSON.parse(Buffer.from(header!, 'base64url').toString())).toEqual({ alg: 'ES256', kid: 'ABC123DEFG' })
    expect(JSON.parse(Buffer.from(claims!, 'base64url').toString())).toEqual({ iss: 'TEAM123456', iat: 1_700_000_000 })
  })

  it('is signed so Apple can verify it with the matching public key (raw r||s, not DER)', () => {
    const [header, claims, signature] = createApnsJwt(status.config, 1_700_000_000).split('.')
    const raw = Buffer.from(signature!, 'base64url')
    expect(raw).toHaveLength(64)
    expect(verify('sha256', Buffer.from(`${header}.${claims}`), { key: publicKey, dsaEncoding: 'ieee-p1363' }, raw)).toBe(true)
  })

  it('fails verification if the payload is tampered with', () => {
    const [header, , signature] = createApnsJwt(status.config, 1_700_000_000).split('.')
    const tampered = Buffer.from(JSON.stringify({ iss: 'EVIL123456', iat: 1 })).toString('base64url')
    expect(
      verify('sha256', Buffer.from(`${header}.${tampered}`), { key: publicKey, dsaEncoding: 'ieee-p1363' }, Buffer.from(signature!, 'base64url')),
    ).toBe(false)
  })
})
