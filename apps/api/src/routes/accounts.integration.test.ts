import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { Hono } from 'hono'

/**
 * Editing an account's balance against its envelopes, on a real, migrated
 * Postgres (opt-in like envelopes.integration.test.ts):
 *
 *   TEST_DATABASE_URL=postgres://… pnpm --filter @finance-tdah/api test
 *
 * An envelope earmarks money the account holds, so the account can't be left
 * with less than its envelopes hold.
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

describe.skipIf(!TEST_DATABASE_URL)('account balance vs envelopes (Postgres)', async () => {
  const { db, schema } = await import('../db/client')
  const { accountsRoute } = await import('./accounts')
  const { envelopesRoute } = await import('./envelopes')
  const { eq, inArray, sql } = await import('drizzle-orm')

  const app = new Hono().route('/accounts', accountsRoute).route('/envelopes', envelopesRoute)
  const run = `a${Date.now()}`
  const ANA = `${run}-ana`

  async function call(method: string, path: string, body?: unknown) {
    const res = await app.request(path, {
      method,
      headers: { 'x-test-user': ANA, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    return { status: res.status, body: (await res.json()) as Record<string, any> }
  }

  async function account(balanceCents: number, type: 'debito' | 'credito' = 'debito') {
    const [row] = await db
      .insert(schema.financialAccount)
      .values({ userId: ANA, name: `acc-${Math.random()}`, type, balanceCents })
      .returning()
    return row
  }

  async function envelope(accountId: string, amountCents: number) {
    const res = await call('POST', '/envelopes', { accountId, name: 'Renta', amountCents })
    expect(res.status).toBe(201)
    return res.body.envelope as { id: string }
  }

  const balanceOf = async (id: string) =>
    (await db.query.financialAccount.findFirst({ where: (a, { eq }) => eq(a.id, id) }))!.balanceCents
  const edit = (id: string, balanceCents: number) => call('PATCH', `/accounts/${id}`, { balanceCents })

  beforeEach(async () => {
    await db.delete(schema.user).where(eq(schema.user.id, ANA))
    await db.insert(schema.user).values({ id: ANA, name: 'Ana', email: `${ANA}@test.local` })
  })

  afterAll(async () => {
    await db.delete(schema.user).where(inArray(schema.user.id, [ANA]))
  })

  it("refuses leaving the account with less than its envelopes hold, and changes nothing", async () => {
    const acc = await account(10_000)
    await envelope(acc.id, 6_000)

    const res = await edit(acc.id, 5_999)

    expect(res.status).toBe(422)
    expect(res.body.error).toMatch(/menos de lo que tienen tus cajitas \(\$60\.00\)/)
    expect(await balanceOf(acc.id)).toBe(10_000)
  })

  it('allows lowering it to exactly what the envelopes hold, and raising it', async () => {
    const acc = await account(10_000)
    await envelope(acc.id, 6_000)

    expect((await edit(acc.id, 6_000)).status).toBe(200)
    expect(await balanceOf(acc.id)).toBe(6_000)
    expect((await edit(acc.id, 20_000)).status).toBe(200)
    expect(await balanceOf(acc.id)).toBe(20_000)
  })

  it('adds up every envelope of the account', async () => {
    const acc = await account(10_000)
    await envelope(acc.id, 3_000)
    await envelope(acc.id, 2_000)

    expect((await edit(acc.id, 4_999)).status).toBe(422)
    expect((await edit(acc.id, 5_000)).status).toBe(200)
  })

  it('ignores overspent envelopes, which hold nothing', async () => {
    const acc = await account(10_000)
    const env = await envelope(acc.id, 1_000)
    await db.update(schema.envelope).set({ balanceCents: -500 }).where(eq(schema.envelope.id, env.id))

    expect((await edit(acc.id, 100)).status).toBe(200)
  })

  it('leaves an account without envelopes free, even to overdraw', async () => {
    const acc = await account(10_000)
    expect((await edit(acc.id, -2_000)).status).toBe(200)
    expect(await balanceOf(acc.id)).toBe(-2_000)
  })

  it('only counts the envelopes of that account', async () => {
    const acc = await account(10_000)
    const other = await account(10_000)
    await envelope(other.id, 9_000)

    expect((await edit(acc.id, 1_000)).status).toBe(200)
  })

  it("doesn't trap an account that is already over-allocated: editing the name, or moving closer, still works", async () => {
    const acc = await account(10_000)
    await envelope(acc.id, 6_000)
    await db.update(schema.financialAccount).set({ balanceCents: 4_000 }).where(eq(schema.financialAccount.id, acc.id))

    expect((await call('PATCH', `/accounts/${acc.id}`, { name: 'Renombrada' })).status).toBe(200)
    expect((await edit(acc.id, 3_999)).status).toBe(422)
    expect((await edit(acc.id, 5_000)).status).toBe(200)
  })

  it("still refuses turning an account with envelopes into a credit card", async () => {
    const acc = await account(10_000)
    await envelope(acc.id, 1_000)

    const res = await call('PATCH', `/accounts/${acc.id}`, { type: 'credito' })

    expect(res.status).toBe(422)
    expect(res.body.error).toMatch(/cajitas/)
  })

  it("404s for someone else's or a missing account", async () => {
    expect((await edit('99999999-9999-4999-8999-999999999999', 1)).status).toBe(404)
  })

  it('never lets an edit and a new envelope both win the same money', async () => {
    for (let i = 0; i < 5; i++) {
      const acc = await account(10_000)
      await Promise.all(Array.from({ length: 6 }, () => db.execute(sql`select pg_sleep(0.05)`)))

      // Lower the balance to 5,000 while 8,000 is being set aside: one of them must lose.
      await Promise.all([edit(acc.id, 5_000), call('POST', '/envelopes', { accountId: acc.id, name: 'Viaje', amountCents: 8_000 })])

      const held = await db.query.envelope.findMany({ where: (e, { eq }) => eq(e.accountId, acc.id) })
      const allocated = held.reduce((sum, e) => sum + Math.max(0, e.balanceCents), 0)
      expect(allocated).toBeLessThanOrEqual(await balanceOf(acc.id))
    }
  })
})
