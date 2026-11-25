import { afterAll, describe, expect, it, vi } from 'vitest'
import { Hono } from 'hono'

/** Paywall + per-platform onboarding on a real Postgres (opt-in via TEST_DATABASE_URL). */
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL

vi.mock('../env', () => ({
  env: {
    DATABASE_URL: process.env.TEST_DATABASE_URL ?? 'postgres://unused',
    NODE_ENV: 'production',
    REVENUECAT_WEBHOOK_AUTH: 'topsecret',
    REVENUECAT_ENTITLEMENT_ID: 'pro',
    ALLOWED_EMAILS: ['free-allow@test.local'],
    ADMIN_EMAILS: ['boss-bill@test.local'],
  },
  features: { billing: true, passwordResetEmail: false, webPush: false },
}))

vi.mock('../middleware/session', () => ({
  sessionMiddleware: async (
    c: { req: { header: (k: string) => string | undefined }; set: (k: string, v: unknown) => void },
    next: () => Promise<void>,
  ) => {
    const id = c.req.header('x-test-user')
    c.set('user', { id, email: c.req.header('x-test-email') ?? `${id}@test.local` })
    await next()
  },
}))

describe.skipIf(!TEST_DATABASE_URL)('billing + onboarding per platform (Postgres)', async () => {
  const { db, schema } = await import('../db/client')
  const { billingRoute } = await import('./billing')
  const { profileRoute } = await import('./profile')
  const { adminRoute } = await import('./admin')
  const { eq, like } = await import('drizzle-orm')

  const app = new Hono().route('/billing', billingRoute).route('/profile', profileRoute).route('/admin', adminRoute)
  const run = `b${Date.now()}`
  const PAYER = `${run}-payer`
  const FREE = `${run}-free`
  const BOSS = `${run}-boss`
  const mk = (id: string, email = `${id}@test.local`) => db.insert(schema.user).values({ id, name: id, email })

  const as = (id: string, email?: string, extra: Record<string, string> = {}) => ({
    'x-test-user': id,
    ...(email ? { 'x-test-email': email } : {}),
    ...extra,
  })
  const status = async (id: string, email?: string) =>
    (await app.request('/billing/status', { headers: as(id, email) })).json() as Promise<{ access: string; hasAccess: boolean; required: boolean }>
  const hook = (type: string, ts: number, expiresInMs: number) =>
    app.request('/billing/webhook', {
      method: 'POST',
      headers: { authorization: 'topsecret', 'content-type': 'application/json' },
      body: JSON.stringify({
        event: { type, app_user_id: PAYER, entitlement_ids: ['pro'], event_timestamp_ms: ts, expiration_at_ms: Date.now() + expiresInMs },
      }),
    })

  afterAll(async () => {
    await db.delete(schema.user).where(like(schema.user.id, `${run}-%`))
  })

  it('needs a subscription, the webhook grants it, an expiration or a stale event cannot undo a newer one', async () => {
    await mk(PAYER)
    expect(await status(PAYER)).toMatchObject({ required: true, hasAccess: false, access: 'none' })

    expect((await hook('INITIAL_PURCHASE', 100, 86_400_000)).status).toBe(200)
    expect(await status(PAYER)).toMatchObject({ hasAccess: true, access: 'subscribed' })

    await hook('EXPIRATION', 50, -1000) // older than what we hold: ignored
    expect((await status(PAYER)).hasAccess).toBe(true)

    await hook('EXPIRATION', 200, -1000)
    expect((await status(PAYER)).hasAccess).toBe(false)
  })

  it('an allowlisted address never pays', async () => {
    await mk(FREE, 'free-allow@test.local')
    expect(await status(FREE, 'Free-Allow@test.local')).toMatchObject({ hasAccess: true, access: 'allowlist' })
  })

  it('onboarding is done once per platform', async () => {
    const id = `${run}-multi`
    await mk(id)
    const body = JSON.stringify({ displayName: 'Ana' })
    const post = (platform: string) =>
      app.request('/profile/onboarding', {
        method: 'POST',
        headers: { ...as(id), 'content-type': 'application/json', 'x-client-platform': platform },
        body,
      })
    const done = async (platform: string) =>
      ((await (await app.request('/profile', { headers: as(id, undefined, { 'x-client-platform': platform }) })).json()) as { profile: { onboardingCompleted: boolean } }).profile.onboardingCompleted

    await post('web')
    expect(await done('web')).toBe(true)
    expect(await done('ios')).toBe(false)
    await post('ios')
    expect(await done('ios')).toBe(true)
    expect((await db.select().from(schema.userOnboarding).where(eq(schema.userOnboarding.userId, id))).length).toBe(2)
  })

  it('only admins get stats; everyone else gets a 404', async () => {
    await mk(BOSS, 'boss-bill@test.local')
    expect((await app.request('/admin/stats', { headers: as(BOSS, 'boss-bill@test.local') })).status).toBe(200)
    expect((await app.request('/admin/stats', { headers: as(PAYER) })).status).toBe(404)
  })
})
