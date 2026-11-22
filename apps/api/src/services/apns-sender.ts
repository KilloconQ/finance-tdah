import http2 from 'node:http2'
import { eq } from 'drizzle-orm'
import { apnsStatus, createApnsJwt, type ApnsConfig } from '../lib/apns'
import { db, schema } from '../db/client'
import { env } from '../env'
import { logger } from '../lib/logger'
import type { PushPayload } from './push-sender'

const HOSTS = { production: 'api.push.apple.com', sandbox: 'api.sandbox.push.apple.com' } as const
type ApnsEnvironment = keyof typeof HOSTS

export type ApnsRequest = { host: string; deviceToken: string; headers: Record<string, string>; body: string }
export type ApnsResponse = { status: number; reason?: string }
/** How a request reaches Apple. Tests pass a fake; production uses HTTP/2 (APNs requires it). */
export type ApnsTransport = (request: ApnsRequest) => Promise<ApnsResponse>

// Apple says a provider token must be refreshed at least every 60 minutes, and refreshing more often than every
// 20 is throttled, so one token is reused for 50.
const JWT_TTL_SECONDS = 50 * 60
let cachedJwt: { token: string; issuedAt: number; keyId: string } | null = null

function providerToken(config: ApnsConfig, nowSeconds: number): string {
  if (cachedJwt && cachedJwt.keyId === config.keyId && nowSeconds - cachedJwt.issuedAt < JWT_TTL_SECONDS) {
    return cachedJwt.token
  }
  cachedJwt = { token: createApnsJwt(config, nowSeconds), issuedAt: nowSeconds, keyId: config.keyId }
  return cachedJwt.token
}

/** What we put on the wire for a notification: Apple's `aps` envelope plus our `url`, which the app turns into a link. */
export function buildApnsBody(payload: PushPayload): string {
  return JSON.stringify({
    aps: { alert: { title: payload.title, body: payload.body }, sound: 'default' },
    ...(payload.url ? { url: payload.url } : {}),
  })
}

/** The token is gone for good: delete it instead of failing on every future notification. */
export function isDeadToken(response: ApnsResponse): boolean {
  return response.status === 410 || (response.status === 400 && (response.reason === 'BadDeviceToken' || response.reason === 'DeviceTokenNotForTopic'))
}

export async function sendApnsToUser(
  userId: string,
  payload: PushPayload,
  transport: ApnsTransport = http2Transport,
  now: () => number = () => Math.floor(Date.now() / 1000),
): Promise<void> {
  const status = apnsStatus({
    keyId: env.APNS_KEY_ID,
    teamId: env.APNS_TEAM_ID,
    bundleId: env.APNS_BUNDLE_ID,
    privateKey: env.APNS_PRIVATE_KEY,
  })
  if (!status.enabled) return

  const devices = await db.query.deviceToken.findMany({ where: (d, { eq }) => eq(d.userId, userId) })
  const body = buildApnsBody(payload)

  await Promise.allSettled(
    devices.map(async (device) => {
      try {
        const response = await transport({
          host: HOSTS[device.environment as ApnsEnvironment] ?? HOSTS.production,
          deviceToken: device.token,
          headers: {
            authorization: `bearer ${providerToken(status.config, now())}`,
            'apns-topic': status.config.bundleId,
            'apns-push-type': 'alert',
            'apns-priority': '10',
            'content-type': 'application/json',
          },
          body,
        })
        if (response.status === 200) return
        if (isDeadToken(response)) {
          await db.delete(schema.deviceToken).where(eq(schema.deviceToken.id, device.id))
          return
        }
        logger.error('apns_send_failed', { userId, status: response.status, reason: response.reason })
      } catch (err) {
        logger.error('apns_send_failed', { userId, message: err instanceof Error ? err.message : String(err) })
      }
    }),
  )
}

// ---- HTTP/2 transport -------------------------------------------------------------------------------------------

const sessions = new Map<string, http2.ClientHttp2Session>()

function sessionFor(host: string): http2.ClientHttp2Session {
  const existing = sessions.get(host)
  if (existing && !existing.closed && !existing.destroyed) return existing
  const session = http2.connect(`https://${host}`)
  session.unref() // an idle connection to Apple must not keep the process alive
  const forget = () => {
    if (sessions.get(host) === session) sessions.delete(host)
  }
  session.on('error', forget)
  session.on('close', forget)
  session.on('goaway', forget)
  sessions.set(host, session)
  return session
}

const REQUEST_TIMEOUT_MS = 10_000

export const http2Transport: ApnsTransport = ({ host, deviceToken, headers, body }) =>
  new Promise((resolve, reject) => {
    const stream = sessionFor(host).request({ ':method': 'POST', ':path': `/3/device/${deviceToken}`, ...headers })
    let status = 0
    let data = ''
    stream.setEncoding('utf8')
    stream.on('response', (responseHeaders) => {
      status = Number(responseHeaders[':status'])
    })
    stream.on('data', (chunk) => {
      data += chunk
    })
    stream.on('end', () => {
      let reason: string | undefined
      try {
        reason = (JSON.parse(data) as { reason?: string }).reason
      } catch {
        // A 200 has no body.
      }
      resolve({ status, reason })
    })
    stream.on('error', reject)
    stream.setTimeout(REQUEST_TIMEOUT_MS, () => {
      stream.close(http2.constants.NGHTTP2_CANCEL)
      reject(new Error('APNs no respondió a tiempo'))
    })
    stream.end(body)
  })
