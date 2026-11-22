import { createPrivateKey, sign, type KeyObject } from 'node:crypto'

/**
 * Apple Push Notification service (APNs) credentials, checked the way `lib/vapid.ts` checks VAPID keys: a missing or
 * malformed set turns native push off with a reason for the startup log, and never takes the API down.
 */
export type ApnsConfig = {
  keyId: string
  teamId: string
  bundleId: string
  privateKey: KeyObject
}

export type ApnsStatus =
  | { enabled: true; config: ApnsConfig }
  // `configured` is true when someone set at least one APNS_* variable: a half-done setup deserves a warning,
  // while an install that never asked for native push should stay quiet.
  | { enabled: false; configured: boolean; problem: string }

type ApnsInput = {
  keyId?: string
  teamId?: string
  bundleId?: string
  privateKey?: string
}

// Apple's key ids and team ids are 10 characters, letters and digits.
const APPLE_ID = /^[A-Z0-9]{10}$/

export function apnsStatus(input: ApnsInput): ApnsStatus {
  const { keyId, teamId, bundleId, privateKey } = input
  const configured = Boolean(keyId || teamId || privateKey)
  const off = (problem: string): ApnsStatus => ({ enabled: false, configured, problem })

  if (!configured) return off('APNS_KEY_ID, APNS_TEAM_ID y APNS_PRIVATE_KEY no están configuradas.')

  const missing = [
    !keyId && 'APNS_KEY_ID',
    !teamId && 'APNS_TEAM_ID',
    !privateKey && 'APNS_PRIVATE_KEY',
    !bundleId && 'APNS_BUNDLE_ID',
  ].filter(Boolean)
  if (missing.length > 0) return off(`Falta ${missing.join(', ')}.`)

  if (!APPLE_ID.test(keyId!)) return off('APNS_KEY_ID no parece un key id de Apple (10 letras y números).')
  if (!APPLE_ID.test(teamId!)) return off('APNS_TEAM_ID no parece un team id de Apple (10 letras y números).')

  let key: KeyObject
  try {
    // Hosting dashboards often keep a multi-line secret on one line with literal "\n".
    key = createPrivateKey(privateKey!.replace(/\\n/g, '\n'))
  } catch {
    return off('APNS_PRIVATE_KEY no es una clave privada válida (el archivo .p8 de Apple).')
  }
  if (key.asymmetricKeyType !== 'ec' || key.asymmetricKeyDetails?.namedCurve !== 'prime256v1') {
    return off('APNS_PRIVATE_KEY tiene que ser una clave EC P-256 (la que Apple entrega en el .p8).')
  }

  return { enabled: true, config: { keyId: keyId!, teamId: teamId!, bundleId: bundleId!, privateKey: key } }
}

const base64url = (input: Buffer | string) => Buffer.from(input).toString('base64url')

/** The provider token APNs expects: ES256 over `{kid}.{iss, iat}`. Apple wants it refreshed hourly, not per request. */
export function createApnsJwt(config: ApnsConfig, nowSeconds: number): string {
  const header = base64url(JSON.stringify({ alg: 'ES256', kid: config.keyId }))
  const claims = base64url(JSON.stringify({ iss: config.teamId, iat: nowSeconds }))
  const data = `${header}.${claims}`
  // JOSE wants the raw r||s signature, not the DER encoding Node produces by default.
  const signature = sign('sha256', Buffer.from(data), { key: config.privateKey, dsaEncoding: 'ieee-p1363' })
  return `${data}.${base64url(signature)}`
}
