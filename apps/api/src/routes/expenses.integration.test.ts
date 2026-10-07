import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { Hono } from 'hono'

/**
 * Edit/delete rules for expenses that a fake db can't show — ownership
 * filters, row locks, concurrent writers — against a real, migrated Postgres.
 * Opt-in like envelopes.integration.test.ts:
 *
 *   TEST_DATABASE_URL=postgres://… pnpm --filter @finance-tdah/api test
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

describe.skipIf(!TEST_DATABASE_URL)('expense edits (Postgres)', async () => {
  const { db, schema } = await import('../db/client')
  const { expensesRoute } = await import('./expenses')
  const { inArray, sql } = await import('drizzle-orm')

  const app = new Hono().route('/expenses', expensesRoute)
  const run = `x${Date.now()}`
  const ANA = `${run}-ana`
  const BETO = `${run}-beto`

  async function call(user: string, method: string, path: string, body?: unknown) {
    const res = await app.request(path, {
      method,
      headers: { 'x-test-user': user, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    return { status: res.status, body: (await res.json()) as Record<string, any> }
  }

  async function account(user: string, balanceCents: number) {
    const [row] = await db
      .insert(schema.financialAccount)
      .values({ userId: user, name: `acc-${Math.random()}`, type: 'debito', balanceCents })
      .returning()
    return row
  }

  const balanceOf = async (id: string) =>
    (await db.query.financialAccount.findFirst({ where: (a, { eq }) => eq(a.id, id) }))!.balanceCents

  async function spend(user: string, accountId: string, amountCents: number) {
    const res = await call(user, 'POST', '/expenses', {
      kind: 'expense',
      amountCents,
      category: 'super',
      description: 'compra',
      accountId,
    })
    expect(res.status).toBe(201)
    return res.body.expense as { id: string }
  }

  // Open the pool's connections first so concurrent requests really overlap.
  const warmPool = () => Promise.all(Array.from({ length: 6 }, () => db.execute(sql`select pg_sleep(0.05)`)))

  beforeEach(async () => {
    await db.delete(schema.user).where(inArray(schema.user.id, [ANA, BETO]))
    await db.insert(schema.user).values([
      { id: ANA, name: 'Ana', email: `${ANA}@test.local` },
      { id: BETO, name: 'Beto', email: `${BETO}@test.local` },
    ])
  })

  afterAll(async () => {
    await db.delete(schema.user).where(inArray(schema.user.id, [ANA, BETO]))
  })

  describe('ownership', () => {
    it("won't edit or delete someone else's expense, and changes nothing", async () => {
      const acc = await account(ANA, 10_000)
      const exp = await spend(ANA, acc.id, 1_000)

      expect((await call(BETO, 'PATCH', `/expenses/${exp.id}`, { amountCents: 5_000 })).status).toBe(404)
      expect((await call(BETO, 'DELETE', `/expenses/${exp.id}`)).status).toBe(404)
      expect(await balanceOf(acc.id)).toBe(9_000)
      expect(await db.query.expense.findFirst({ where: (e, { eq }) => eq(e.id, exp.id) })).toMatchObject({
        amountCents: 1_000,
      })
    })

    it("won't move an expense onto someone else's account", async () => {
      const acc = await account(ANA, 10_000)
      const betos = await account(BETO, 5_000)
      const exp = await spend(ANA, acc.id, 1_000)

      const res = await call(ANA, 'PATCH', `/expenses/${exp.id}`, { accountId: betos.id })
      expect(res.status).toBe(404)
      expect(res.body.error).toMatch(/Cuenta no encontrada/)
      expect(await balanceOf(acc.id)).toBe(9_000)
      expect(await balanceOf(betos.id)).toBe(5_000)
    })
  })

  describe('transfers', () => {
    it('refuses turning an expense into a transfer to the same account, and changes nothing', async () => {
      const acc = await account(ANA, 10_000)
      const exp = await spend(ANA, acc.id, 1_000)

      const res = await call(ANA, 'PATCH', `/expenses/${exp.id}`, { kind: 'transfer', toAccountId: acc.id })
      expect(res.status).toBe(422)
      expect(res.body.error).toMatch(/dos cuentas distintas/)
      expect(await balanceOf(acc.id)).toBe(9_000)
    })

    it('refuses a transfer with no destination', async () => {
      const acc = await account(ANA, 10_000)
      const exp = await spend(ANA, acc.id, 1_000)

      const res = await call(ANA, 'PATCH', `/expenses/${exp.id}`, { kind: 'transfer' })
      expect(res.status).toBe(422)
      expect(await balanceOf(acc.id)).toBe(9_000)
    })
  })

  describe('concurrent writers', () => {
    it('two edits of the same expense apply the change once, not twice', async () => {
      const acc = await account(ANA, 10_000)
      const exp = await spend(ANA, acc.id, 1_000)
      await warmPool()

      const results = await Promise.all([
        call(ANA, 'PATCH', `/expenses/${exp.id}`, { amountCents: 2_000 }),
        call(ANA, 'PATCH', `/expenses/${exp.id}`, { amountCents: 2_000 }),
        call(ANA, 'PATCH', `/expenses/${exp.id}`, { amountCents: 2_000 }),
      ])
      expect(results.map((r) => r.status)).toEqual([200, 200, 200])
      // 10,000 - 2,000: each edit reverses what the row held when it ran.
      expect(await balanceOf(acc.id)).toBe(8_000)
    })

    it('an edit racing a delete leaves the account whole, without deadlocking', async () => {
      for (let i = 0; i < 5; i++) {
        const acc = await account(ANA, 10_000)
        const exp = await spend(ANA, acc.id, 1_000)
        await warmPool()

        const [patch, del] = await Promise.all([
          call(ANA, 'PATCH', `/expenses/${exp.id}`, { amountCents: 2_000 }),
          call(ANA, 'DELETE', `/expenses/${exp.id}`),
        ])
        // Whichever ran second sees the other's result: never a 500.
        expect([200, 404]).toContain(patch.status)
        expect(del.status).toBe(200)
        expect(await balanceOf(acc.id)).toBe(10_000)
      }
    })
  })
})
