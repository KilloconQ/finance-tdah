import { describe, expect, it, vi } from 'vitest'
import { Hono } from 'hono'

vi.mock('../env', () => ({
  env: { NODE_ENV: 'production', REVENUECAT_WEBHOOK_AUTH: 'topsecret', REVENUECAT_ENTITLEMENT_ID: 'pro', ALLOWED_EMAILS: [] },
  features: { billing: true },
}))
const insert = vi.fn()
vi.mock('../db/client', () => ({
  db: { insert, query: { user: { findFirst: vi.fn() } } },
  schema: { user: {}, billingEntitlement: {} },
}))
vi.mock('../middleware/session', () => ({ sessionMiddleware: async (_c: unknown, next: () => Promise<void>) => next() }))

const { billingRoute } = await import('./billing')
const app = new Hono().route('/billing', billingRoute)

const post = (body: unknown, auth?: string) =>
  app.request('/billing/webhook', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(auth ? { authorization: auth } : {}) },
    body: JSON.stringify(body),
  })
const event = (over: Record<string, unknown> = {}) => ({
  event: { type: 'INITIAL_PURCHASE', app_user_id: 'u1', entitlement_ids: ['pro'], event_timestamp_ms: 1, expiration_at_ms: 2, ...over },
})

describe('RevenueCat webhook', () => {
  it('rejects a missing or wrong secret', async () => {
    expect((await post(event())).status).toBe(401)
    expect((await post(event(), 'nope')).status).toBe(401)
    expect(insert).not.toHaveBeenCalled()
  })

  it('rejects a payload that is not an event', async () => {
    expect((await post({ hello: 1 }, 'topsecret')).status).toBe(400)
  })

  it('ignores events for other entitlements, tests and transfers without touching the database', async () => {
    for (const over of [{ entitlement_ids: ['other'] }, { type: 'TEST' }, { type: 'TRANSFER' }]) {
      expect((await post(event(over), 'topsecret')).status).toBe(200)
    }
    expect(insert).not.toHaveBeenCalled()
  })
})
