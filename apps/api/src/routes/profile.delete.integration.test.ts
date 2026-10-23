import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { Hono } from 'hono'

/**
 * POST /profile/delete must remove the better-auth user, its sessions, credentials,
 * push subscriptions and finance data, against a real Postgres (opt-in via
 * TEST_DATABASE_URL, like the other *.integration.test.ts files).
 */
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL

vi.mock('../env', () => ({
  env: { DATABASE_URL: process.env.TEST_DATABASE_URL ?? 'postgres://unused', NODE_ENV: 'test' },
  features: { passwordResetEmail: false, webPush: false },
}))

vi.mock('../middleware/session', () => ({
  sessionMiddleware: async (
    c: { req: { header: (k: string) => string | undefined }; set: (k: string, v: unknown) => void },
    next: () => Promise<void>,
  ) => {
    c.set('user', { id: c.req.header('x-test-user'), email: `${c.req.header('x-test-user')}@test.local` })
    await next()
  },
}))

vi.mock('../services/push-sender', () => ({ sendPushToUser: vi.fn() }))

describe.skipIf(!TEST_DATABASE_URL)('delete account (Postgres)', async () => {
  const { db, schema } = await import('../db/client')
  const { profileRoute } = await import('./profile')
  const { eq } = await import('drizzle-orm')

  const app = new Hono().route('/profile', profileRoute)
  const run = `d${Date.now()}`
  const ANA = `${run}-ana`
  const BEA = `${run}-bea`

  async function seed(id: string) {
    await db.insert(schema.user).values({ id, name: id, email: `${id}@test.local` })
    await db.insert(schema.session).values({
      id: `${id}-s`, userId: id, token: `${id}-t`, expiresAt: new Date(Date.now() + 3_600_000),
    })
    await db.insert(schema.account).values({
      id: `${id}-a`, userId: id, accountId: id, providerId: 'credential', password: 'hash',
    })
    await db.insert(schema.verification).values({
      id: `${id}-v`, identifier: `${id}@test.local`, value: 'x', expiresAt: new Date(Date.now() + 3_600_000),
    })
    await db.insert(schema.pushSubscription).values({
      userId: id, endpoint: `https://push.test/${id}`, p256dh: 'k', auth: 'a',
    })
    await db.insert(schema.goal).values({ userId: id, name: 'Viaje', emoji: 'x', targetCents: 1000 })
  }

  async function remaining(id: string) {
    const [users, sessions, accounts, pushes, goals, verifications] = await Promise.all([
      db.select().from(schema.user).where(eq(schema.user.id, id)),
      db.select().from(schema.session).where(eq(schema.session.userId, id)),
      db.select().from(schema.account).where(eq(schema.account.userId, id)),
      db.select().from(schema.pushSubscription).where(eq(schema.pushSubscription.userId, id)),
      db.select().from(schema.goal).where(eq(schema.goal.userId, id)),
      db.select().from(schema.verification).where(eq(schema.verification.identifier, `${id}@test.local`)),
    ])
    return [users, sessions, accounts, pushes, goals, verifications].map((r) => r.length)
  }

  async function cleanup() {
    for (const id of [ANA, BEA]) {
      await db.delete(schema.user).where(eq(schema.user.id, id))
      await db.delete(schema.verification).where(eq(schema.verification.id, `${id}-v`))
    }
  }

  beforeEach(async () => {
    await cleanup()
    await seed(ANA)
    await seed(BEA)
  })

  afterAll(cleanup)

  it('removes the user, its sessions, credentials, push subscriptions and data', async () => {
    const res = await app.request('/profile/delete', { method: 'POST', headers: { 'x-test-user': ANA } })

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true })
    expect(await remaining(ANA)).toEqual([0, 0, 0, 0, 0, 0])
  })

  it('leaves other users untouched', async () => {
    await app.request('/profile/delete', { method: 'POST', headers: { 'x-test-user': ANA } })

    expect(await remaining(BEA)).toEqual([1, 1, 1, 1, 1, 1])
  })
})
