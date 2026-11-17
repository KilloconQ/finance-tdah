import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { Hono } from 'hono'

/** Hostile inputs for a credit card's statement days (opt-in: TEST_DATABASE_URL). */
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
    c.set('user', { id: c.req.header('x-test-user') })
    await next()
  },
}))

vi.mock('../services/push-sender', () => ({ sendPushToUser: vi.fn() }))

describe.skipIf(!TEST_DATABASE_URL)('statement days, hostile inputs (Postgres)', async () => {
  const { db, schema } = await import('../db/client')
  const { accountsRoute } = await import('./accounts')
  const { eq } = await import('drizzle-orm')

  const app = new Hono().route('/accounts', accountsRoute)
  const ANA = `d${Date.now()}-ana`

  async function call(method: string, path: string, body?: unknown) {
    const res = await app.request(path, {
      method,
      headers: { 'x-test-user': ANA, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    return { status: res.status, body: (await res.json()) as Record<string, any> }
  }
  const create = (extra: Record<string, unknown>) =>
    call('POST', '/accounts', { name: `acc-${Math.random()}`, type: 'credito', ...extra })

  beforeEach(async () => {
    await db.delete(schema.user).where(eq(schema.user.id, ANA))
    await db.insert(schema.user).values({ id: ANA, name: 'Ana', email: `${ANA}@test.local` })
  })

  afterAll(async () => {
    await db.delete(schema.user).where(eq(schema.user.id, ANA))
  })

  it.each([0, 32, -1, 1.5, '10', null, 1e9, Number.NaN])('rejects the day %j on create', async (day) => {
    expect((await create({ cutoffDay: day, paymentDay: 25 })).status).toBe(400)
    expect((await create({ cutoffDay: 10, paymentDay: day })).status).toBe(400)
  })

  it('accepts the boundary days 1 and 31', async () => {
    const res = await create({ cutoffDay: 31, paymentDay: 1 })
    expect(res.status).toBe(201)
    expect(res.body.account).toMatchObject({ cutoffDay: 31, paymentDay: 1 })
  })

  it('stores no days on an account that is not a credit card', async () => {
    const res = await create({ type: 'debito', cutoffDay: 10, paymentDay: 25 })
    expect(res.body.account).toMatchObject({ cutoffDay: null, paymentDay: null })
  })

  it('does not let a patch put days on a non-credit account', async () => {
    const { body } = await create({ type: 'debito' })
    const patched = await call('PATCH', `/accounts/${body.account.id}`, { cutoffDay: 5, paymentDay: 20 })
    expect(patched.body.account).toMatchObject({ cutoffDay: null, paymentDay: null })
  })

  it('clears the days when a credit card becomes another type', async () => {
    const { body } = await create({ cutoffDay: 10, paymentDay: 25 })
    const patched = await call('PATCH', `/accounts/${body.account.id}`, { type: 'debito' })
    expect(patched.body.account).toMatchObject({ type: 'debito', cutoffDay: null, paymentDay: null })
  })

  it('refuses a patch that would leave only one of the two days', async () => {
    const { body } = await create({ cutoffDay: 10, paymentDay: 25 })
    const patched = await call('PATCH', `/accounts/${body.account.id}`, { paymentDay: null })
    expect(patched.status).toBe(422)
    const stored = await call('GET', '/accounts')
    expect(stored.body.accounts[0]).toMatchObject({ cutoffDay: 10, paymentDay: 25 })
  })

  it('clears both days together and leaves unrelated patches alone', async () => {
    const { body } = await create({ cutoffDay: 10, paymentDay: 25 })
    const id = body.account.id
    const renamed = await call('PATCH', `/accounts/${id}`, { name: 'Otra' })
    expect(renamed.body.account).toMatchObject({ name: 'Otra', cutoffDay: 10, paymentDay: 25 })
    const cleared = await call('PATCH', `/accounts/${id}`, { cutoffDay: null, paymentDay: null })
    expect(cleared.body.account).toMatchObject({ cutoffDay: null, paymentDay: null })
  })
})
