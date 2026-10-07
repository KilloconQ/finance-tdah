import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { Hono } from 'hono'

/**
 * A PATCH that doesn't mention a field must leave it alone, against a real, migrated
 * Postgres (opt-in like envelopes.integration.test.ts):
 *
 *   TEST_DATABASE_URL=postgres://… pnpm --filter @finance-tdah/api test
 *
 * The routes spread the parsed patch into the UPDATE, so a default that leaks in from a
 * create schema (Zod 4 keeps `.default()` under `.partial()`) overwrites stored data.
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
    c.set('user', { id: c.req.header('x-test-user') })
    await next()
  },
}))

vi.mock('../services/push-sender', () => ({ sendPushToUser: vi.fn() }))

describe.skipIf(!TEST_DATABASE_URL)('partial updates (Postgres)', async () => {
  const { db, schema } = await import('../db/client')
  const { goalsRoute } = await import('./goals')
  const { subscriptionsRoute } = await import('./subscriptions')
  const { accountsRoute } = await import('./accounts')
  const { eq } = await import('drizzle-orm')

  const app = new Hono().route('/goals', goalsRoute).route('/subscriptions', subscriptionsRoute).route('/accounts', accountsRoute)
  const run = `p${Date.now()}`
  const ANA = `${run}-ana`

  async function call(method: string, path: string, body?: unknown) {
    const res = await app.request(path, {
      method,
      headers: { 'x-test-user': ANA, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    return { status: res.status, body: (await res.json()) as Record<string, any> }
  }

  beforeEach(async () => {
    await db.delete(schema.user).where(eq(schema.user.id, ANA))
    await db.insert(schema.user).values({ id: ANA, name: 'Ana', email: `${ANA}@test.local` })
  })

  afterAll(async () => {
    await db.delete(schema.user).where(eq(schema.user.id, ANA))
  })

  it("renaming a goal keeps its emoji", async () => {
    const created = await call('POST', '/goals', { name: 'Viaje', emoji: '✈️', targetCents: 500_000 })
    expect(created.status).toBe(201)

    const res = await call('PATCH', `/goals/${created.body.goal.id}`, { name: 'Playa' })

    expect(res.status).toBe(200)
    expect(res.body.goal).toMatchObject({ name: 'Playa', emoji: '✈️', targetCents: 500_000 })
  })

  it('changing a yearly subscription\'s amount keeps it yearly', async () => {
    const created = await call('POST', '/subscriptions', {
      name: 'Dominio',
      category: 'trabajo',
      amountCents: 29_900,
      cadence: 'yearly',
      nextChargeAt: '2027-03-01',
    })
    expect(created.status).toBe(201)

    const res = await call('PATCH', `/subscriptions/${created.body.subscription.id}`, { amountCents: 31_900 })

    expect(res.status).toBe(200)
    expect(res.body.subscription).toMatchObject({ amountCents: 31_900, cadence: 'yearly', name: 'Dominio' })
  })

  it("renaming an account keeps its balance", async () => {
    const created = await call('POST', '/accounts', { name: 'BBVA', type: 'debito', balanceCents: 842_000 })
    expect(created.status).toBe(201)

    const res = await call('PATCH', `/accounts/${created.body.account.id}`, { name: 'BBVA personal' })

    expect(res.status).toBe(200)
    expect(res.body.account).toMatchObject({ name: 'BBVA personal', balanceCents: 842_000 })
  })
})
