import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { Hono } from 'hono'

/**
 * Runs the envelope and expense routes against a real, migrated Postgres —
 * the rules here (row locks, FK cascades, sums across rows) are exactly what
 * a fake db can't show. Opt-in because the suite otherwise needs no database:
 *
 *   TEST_DATABASE_URL=postgres://… pnpm --filter @finance-tdah/api test
 *
 * Every row it creates hangs off throwaway users, deleted afterwards.
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

describe.skipIf(!TEST_DATABASE_URL)('envelopes (Postgres)', async () => {
  const { db, schema } = await import('../db/client')
  const { envelopesRoute } = await import('./envelopes')
  const { expensesRoute } = await import('./expenses')
  const { eq, inArray } = await import('drizzle-orm')

  const app = new Hono().route('/envelopes', envelopesRoute).route('/expenses', expensesRoute)
  const run = `t${Date.now()}`
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

  async function account(user: string, balanceCents: number, type: 'debito' | 'credito' = 'debito') {
    const [row] = await db
      .insert(schema.financialAccount)
      .values({ userId: user, name: `acc-${Math.random()}`, type, balanceCents })
      .returning()
    return row
  }

  const balanceOf = async (id: string) =>
    (await db.query.financialAccount.findFirst({ where: (a, { eq }) => eq(a.id, id) }))!.balanceCents
  const envelopeOf = async (id: string) => db.query.envelope.findFirst({ where: (e, { eq }) => eq(e.id, id) })

  async function envelope(user: string, accountId: string, amountCents: number) {
    const res = await call(user, 'POST', '/envelopes', { accountId, name: 'Súper', amountCents })
    expect(res.status).toBe(201)
    return res.body.envelope as { id: string; balanceCents: number }
  }

  async function spend(user: string, accountId: string, envelopeId: string | undefined, amountCents: number) {
    const res = await call(user, 'POST', '/expenses', {
      kind: 'expense',
      amountCents,
      category: 'super',
      description: 'compra',
      accountId,
      envelopeId,
    })
    expect(res.status).toBe(201)
    return res.body.expense as { id: string; envelopeId: string | null }
  }

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

  describe('setting money aside', () => {
    it('creates an envelope with up to what the account has unassigned', async () => {
      const acc = await account(ANA, 10_000)
      await envelope(ANA, acc.id, 6_000)
      const ok = await call(ANA, 'POST', '/envelopes', { accountId: acc.id, name: 'Renta', amountCents: 4_000 })
      expect(ok.status).toBe(201)
      expect(ok.body.envelope).toMatchObject({ accountId: acc.id, balanceCents: 4_000, emoji: '📦' })

      const over = await call(ANA, 'POST', '/envelopes', { accountId: acc.id, name: 'Otra', amountCents: 1 })
      expect(over.status).toBe(422)
      expect(over.body.error).toMatch(/ya apartaste todo/)
      // Setting money aside moves none: the account keeps its balance.
      expect(await balanceOf(acc.id)).toBe(10_000)
    })

    it('says how much is left when asking for too much', async () => {
      const acc = await account(ANA, 10_000)
      await envelope(ANA, acc.id, 7_000)
      const res = await call(ANA, 'POST', '/envelopes', { accountId: acc.id, name: 'x', amountCents: 5_000 })
      expect(res.status).toBe(422)
      expect(res.body.error).toContain('$30.00')
    })

    it('refuses envelopes on credit cards', async () => {
      const card = await account(ANA, -5_000, 'credito')
      const res = await call(ANA, 'POST', '/envelopes', { accountId: card.id, name: 'x' })
      expect(res.status).toBe(422)
      expect(res.body.error).toMatch(/tarjetas de crédito/)
    })

    it("can't use someone else's account or envelope", async () => {
      const anas = await account(ANA, 10_000)
      const env = await envelope(ANA, anas.id, 1_000)
      expect((await call(BETO, 'POST', '/envelopes', { accountId: anas.id, name: 'x' })).status).toBe(404)
      expect((await call(BETO, 'POST', `/envelopes/${env.id}/adjust`, { deltaCents: -100 })).status).toBe(404)
      expect((await call(BETO, 'PATCH', `/envelopes/${env.id}`, { name: 'mío' })).status).toBe(404)
      expect((await call(BETO, 'DELETE', `/envelopes/${env.id}`)).status).toBe(404)
      expect((await call(BETO, 'GET', '/envelopes')).body.envelopes).toEqual([])
      expect((await envelopeOf(env.id))!.balanceCents).toBe(1_000)
    })

    it('adds and releases within the limits', async () => {
      const acc = await account(ANA, 10_000)
      const env = await envelope(ANA, acc.id, 2_000)

      expect((await call(ANA, 'POST', `/envelopes/${env.id}/adjust`, { deltaCents: 8_000 })).body.envelope.balanceCents).toBe(
        10_000,
      )
      expect((await call(ANA, 'POST', `/envelopes/${env.id}/adjust`, { deltaCents: 1 })).status).toBe(422)
      expect((await call(ANA, 'POST', `/envelopes/${env.id}/adjust`, { deltaCents: -10_000 })).body.envelope.balanceCents).toBe(0)

      const tooMuch = await call(ANA, 'POST', `/envelopes/${env.id}/adjust`, { deltaCents: -1 })
      expect(tooMuch.status).toBe(422)
      expect(tooMuch.body.error).toMatch(/no tiene dinero para liberar/)
      expect((await call(ANA, 'POST', `/envelopes/${env.id}/adjust`, { deltaCents: 0 })).status).toBe(400)
    })

    it('never lets concurrent moves set the same money aside twice', async () => {
      const acc = await account(ANA, 10_000)
      const envs = await Promise.all(Array.from({ length: 8 }, () => envelope(ANA, acc.id, 0)))

      // 8 × $30 against $100: only 3 can fit, whatever order they land in.
      const results = await Promise.all(
        envs.map((e) => call(ANA, 'POST', `/envelopes/${e.id}/adjust`, { deltaCents: 3_000 })),
      )
      expect(results.filter((r) => r.status === 200)).toHaveLength(3)
      expect(results.filter((r) => r.status === 422)).toHaveLength(5)
      const balances = await Promise.all(envs.map(async (e) => (await envelopeOf(e.id))!.balanceCents))
      expect(balances.reduce((a, b) => a + b, 0)).toBe(9_000)
    })

    it('renames, and deleting keeps the money in the account and the expense history', async () => {
      const acc = await account(ANA, 10_000)
      const env = await envelope(ANA, acc.id, 3_000)
      const exp = await spend(ANA, acc.id, env.id, 1_000)

      expect((await call(ANA, 'PATCH', `/envelopes/${env.id}`, { name: 'Despensa', emoji: '🛒' })).body.envelope).toMatchObject({
        name: 'Despensa',
        emoji: '🛒',
      })
      expect((await call(ANA, 'DELETE', `/envelopes/${env.id}`)).status).toBe(200)
      expect(await envelopeOf(env.id)).toBeUndefined()
      expect(await balanceOf(acc.id)).toBe(9_000)
      const kept = await db.query.expense.findFirst({ where: (e, { eq }) => eq(e.id, exp.id) })
      expect(kept?.envelopeId).toBeNull()
    })

    it('deleting the account takes its envelopes with it', async () => {
      const acc = await account(ANA, 10_000)
      const env = await envelope(ANA, acc.id, 3_000)
      await db.delete(schema.financialAccount).where(eq(schema.financialAccount.id, acc.id))
      expect(await envelopeOf(env.id)).toBeUndefined()
    })
  })

  describe('spending from an envelope', () => {
    it('takes the expense out of both the account and the envelope', async () => {
      const acc = await account(ANA, 10_000)
      const env = await envelope(ANA, acc.id, 3_000)
      const exp = await spend(ANA, acc.id, env.id, 1_200)
      expect(exp.envelopeId).toBe(env.id)
      expect(await balanceOf(acc.id)).toBe(8_800)
      expect((await envelopeOf(env.id))!.balanceCents).toBe(1_800)
    })

    it('records an overspend instead of refusing it', async () => {
      const acc = await account(ANA, 10_000)
      const env = await envelope(ANA, acc.id, 1_000)
      await spend(ANA, acc.id, env.id, 1_500)
      expect((await envelopeOf(env.id))!.balanceCents).toBe(-500)
      expect(await balanceOf(acc.id)).toBe(8_500)
    })

    it('leaves envelopes alone for expenses paid without one', async () => {
      const acc = await account(ANA, 10_000)
      const env = await envelope(ANA, acc.id, 3_000)
      await spend(ANA, acc.id, undefined, 500)
      expect((await envelopeOf(env.id))!.balanceCents).toBe(3_000)
    })

    it("refuses another account's envelope, someone else's, or one on income", async () => {
      const acc = await account(ANA, 10_000)
      const other = await account(ANA, 10_000)
      const env = await envelope(ANA, other.id, 1_000)
      const betos = await envelope(BETO, (await account(BETO, 10_000)).id, 1_000)
      const base = { kind: 'expense', amountCents: 100, category: 'super', description: 'x', accountId: acc.id }

      const mismatch = await call(ANA, 'POST', '/expenses', { ...base, envelopeId: env.id })
      expect(mismatch.status).toBe(422)
      expect(mismatch.body.error).toMatch(/otra cuenta/)
      expect((await call(ANA, 'POST', '/expenses', { ...base, envelopeId: betos.id })).status).toBe(404)
      expect((await call(ANA, 'POST', '/expenses', { ...base, kind: 'income', envelopeId: env.id })).status).toBe(400)

      // Nothing was written by the refused requests.
      expect(await balanceOf(acc.id)).toBe(10_000)
      expect((await envelopeOf(env.id))!.balanceCents).toBe(1_000)
    })

    it('deleting the expense gives the money back to the envelope', async () => {
      const acc = await account(ANA, 10_000)
      const env = await envelope(ANA, acc.id, 3_000)
      const exp = await spend(ANA, acc.id, env.id, 1_200)
      expect((await call(ANA, 'DELETE', `/expenses/${exp.id}`)).status).toBe(200)
      expect((await envelopeOf(env.id))!.balanceCents).toBe(3_000)
      expect(await balanceOf(acc.id)).toBe(10_000)
    })
  })

  describe('editing an expense paid from an envelope', () => {
    async function setup() {
      const acc = await account(ANA, 10_000)
      const env = await envelope(ANA, acc.id, 3_000)
      const exp = await spend(ANA, acc.id, env.id, 1_000)
      return { acc, env, exp }
    }

    it('applies only the difference when the amount changes', async () => {
      const { acc, env, exp } = await setup()
      await call(ANA, 'PATCH', `/expenses/${exp.id}`, { amountCents: 1_500 })
      expect((await envelopeOf(env.id))!.balanceCents).toBe(1_500)
      expect(await balanceOf(acc.id)).toBe(8_500)
    })

    it('moves the expense to another envelope of the same account', async () => {
      const { acc, env, exp } = await setup()
      const other = await envelope(ANA, acc.id, 2_000)
      const res = await call(ANA, 'PATCH', `/expenses/${exp.id}`, { envelopeId: other.id })
      expect(res.body.expense.envelopeId).toBe(other.id)
      expect((await envelopeOf(env.id))!.balanceCents).toBe(3_000)
      expect((await envelopeOf(other.id))!.balanceCents).toBe(1_000)
    })

    it('gives the money back when the envelope is cleared', async () => {
      const { env, exp } = await setup()
      const res = await call(ANA, 'PATCH', `/expenses/${exp.id}`, { envelopeId: null })
      expect(res.body.expense.envelopeId).toBeNull()
      expect((await envelopeOf(env.id))!.balanceCents).toBe(3_000)
    })

    it('drops the envelope when the expense moves to another account', async () => {
      const { env, exp } = await setup()
      const other = await account(ANA, 5_000)
      const res = await call(ANA, 'PATCH', `/expenses/${exp.id}`, { accountId: other.id })
      expect(res.body.expense.envelopeId).toBeNull()
      expect((await envelopeOf(env.id))!.balanceCents).toBe(3_000)
      expect(await balanceOf(other.id)).toBe(4_000)
    })

    it('drops the envelope when the expense becomes income', async () => {
      const { env, exp } = await setup()
      const res = await call(ANA, 'PATCH', `/expenses/${exp.id}`, { kind: 'income', category: 'ingreso' })
      expect(res.body.expense.envelopeId).toBeNull()
      expect((await envelopeOf(env.id))!.balanceCents).toBe(3_000)
    })

    it("refuses another account's envelope and changes nothing", async () => {
      const { acc, env, exp } = await setup()
      const foreign = await envelope(ANA, (await account(ANA, 5_000)).id, 1_000)
      const res = await call(ANA, 'PATCH', `/expenses/${exp.id}`, { envelopeId: foreign.id, amountCents: 2_000 })
      expect(res.status).toBe(422)
      expect((await envelopeOf(env.id))!.balanceCents).toBe(2_000)
      expect((await envelopeOf(foreign.id))!.balanceCents).toBe(1_000)
      expect(await balanceOf(acc.id)).toBe(9_000)
    })

    it('refuses an envelope on a movement that is not an expense', async () => {
      const { env, exp } = await setup()
      const res = await call(ANA, 'PATCH', `/expenses/${exp.id}`, { kind: 'income', envelopeId: env.id })
      expect(res.status).toBe(422)
      expect(res.body.error).toMatch(/Solo un gasto/)
    })
  })
})
