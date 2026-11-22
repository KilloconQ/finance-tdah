import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { Hono } from 'hono'
import { createCaller, dropUsers, seedUsers, testUserIds } from '../test/integration'

/**
 * Registering an iPhone for native push, on a real, migrated Postgres (opt-in like the other
 * integration tests):
 *
 *   TEST_DATABASE_URL=postgres://… pnpm --filter @finance-tdah/api test
 */
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL

vi.mock('../env', () => ({
  env: { DATABASE_URL: process.env.TEST_DATABASE_URL ?? 'postgres://unused', NODE_ENV: 'test' },
  features: { passwordResetEmail: false, webPush: false, apns: true },
}))

vi.mock('../middleware/session', () => ({
  sessionMiddleware: async (
    c: { req: { header: (k: string) => string | undefined }; set: (k: string, v: unknown) => void },
    next: () => Promise<void>,
  ) => {
    c.set('user', { id: c.req.header('x-test-user') })
    await next()
  },
}))

describe.skipIf(!TEST_DATABASE_URL)('native push device registration (Postgres)', async () => {
  const { db, schema } = await import('../db/client')
  const { pushRoute } = await import('./push')
  const { eq } = await import('drizzle-orm')

  const app = new Hono().route('/push', pushRoute)
  const [ANA, BEN] = testUserIds('d', ['ana', 'ben'])
  const call = createCaller(app)
  const TOKEN = 'ab'.repeat(32)

  beforeAll(async () => {
    await seedUsers(db, schema, [ANA, BEN])
  })

  afterAll(async () => {
    await dropUsers(db, schema, [ANA, BEN])
  })

  const rows = (token: string) => db.select().from(schema.deviceToken).where(eq(schema.deviceToken.token, token))

  it('registers a device for the signed-in user', async () => {
    const res = await call(ANA, 'POST', '/push/device', { token: TOKEN, environment: 'sandbox' })
    expect(res.status).toBe(201)
    const [row] = await rows(TOKEN)
    expect(row).toMatchObject({ userId: ANA, environment: 'sandbox' })
  })

  it('is idempotent: registering the same token again keeps one row and updates the environment', async () => {
    await call(ANA, 'POST', '/push/device', { token: TOKEN, environment: 'production' })
    const found = await rows(TOKEN)
    expect(found).toHaveLength(1)
    expect(found[0]!.environment).toBe('production')
  })

  it('stores tokens lowercase, so the same device never lands twice', async () => {
    const upper = 'CD'.repeat(32)
    await call(ANA, 'POST', '/push/device', { token: upper, environment: 'production' })
    await call(ANA, 'POST', '/push/device', { token: upper.toLowerCase(), environment: 'production' })
    expect(await rows(upper.toLowerCase())).toHaveLength(1)
    expect(await rows(upper)).toHaveLength(0)
  })

  it('moves the device to whoever signed in last on that phone', async () => {
    await call(BEN, 'POST', '/push/device', { token: TOKEN, environment: 'production' })
    const [row] = await rows(TOKEN)
    expect(row!.userId).toBe(BEN)
  })

  it('refuses tokens that are not hex, or are far too short', async () => {
    for (const token of ['', 'not-hex', 'ab', 'zz'.repeat(32), 'ab'.repeat(500)]) {
      expect((await call(ANA, 'POST', '/push/device', { token, environment: 'production' })).status).toBe(400)
    }
    expect((await call(ANA, 'POST', '/push/device', { token: TOKEN, environment: 'staging' })).status).toBe(400)
    expect((await call(ANA, 'POST', '/push/device', { token: TOKEN })).status).toBe(400)
  })

  it("never lets someone delete another person's device", async () => {
    // BEN owns TOKEN now (see above).
    expect((await call(ANA, 'DELETE', '/push/device', { token: TOKEN })).status).toBe(404)
    expect(await rows(TOKEN)).toHaveLength(1)
  })

  it('unregisters your own device, and says so when there is none', async () => {
    expect((await call(BEN, 'DELETE', '/push/device', { token: TOKEN })).status).toBe(200)
    expect(await rows(TOKEN)).toHaveLength(0)
    expect((await call(BEN, 'DELETE', '/push/device', { token: TOKEN })).status).toBe(404)
  })

  it('deleting a user takes their devices with them', async () => {
    const token = 'ef'.repeat(32)
    await call(BEN, 'POST', '/push/device', { token, environment: 'production' })
    await db.delete(schema.user).where(eq(schema.user.id, BEN))
    expect(await rows(token)).toHaveLength(0)
  })
})
