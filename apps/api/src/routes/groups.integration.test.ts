import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { Hono } from 'hono'

/**
 * Shared expense groups on a real, migrated Postgres (opt-in like the other
 * integration tests):
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

describe.skipIf(!TEST_DATABASE_URL)('shared expense groups (Postgres)', async () => {
  const { db, schema } = await import('../db/client')
  const { groupsRoute } = await import('./groups')
  const { inArray } = await import('drizzle-orm')

  const app = new Hono().route('/groups', groupsRoute)
  const run = `g${Date.now()}`
  const [ANA, BEN, CAM, OUT] = ['ana', 'ben', 'cam', 'out'].map((n) => `${run}-${n}`)
  const email = (id: string) => `${id}@test.local`

  async function call(as: string, method: string, path: string, body?: unknown) {
    const res = await app.request(path, {
      method,
      headers: { 'x-test-user': as, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    return { status: res.status, body: (await res.json()) as Record<string, any> }
  }

  let groupId: string

  beforeAll(async () => {
    await db
      .insert(schema.user)
      .values([ANA, BEN, CAM, OUT].map((id) => ({ id, name: id, email: email(id) })))
    const created = await call(ANA, 'POST', '/groups', { name: 'Viaje' })
    groupId = created.body.group.id
    await call(ANA, 'POST', `/groups/${groupId}/members`, { email: email(BEN) })
    await call(ANA, 'POST', `/groups/${groupId}/members`, { email: email(CAM) })
  })

  afterAll(async () => {
    await db.delete(schema.user).where(inArray(schema.user.id, [ANA, BEN, CAM, OUT]))
  })

  it('S1: creator is a member, members see the group, unknown email gets a generic error', async () => {
    const list = await call(BEN, 'GET', '/groups')
    expect(list.body.groups.map((g: { id: string }) => g.id)).toEqual([groupId])
    expect(list.body.groups[0].members).toHaveLength(3)

    const missing = await call(ANA, 'POST', `/groups/${groupId}/members`, { email: 'nadie@test.local' })
    expect(missing.status).toBe(404)
    expect(missing.body.error).toBe('No pudimos agregar a esa persona')
  })

  it('S5: a non-member can neither read nor write the group', async () => {
    expect((await call(OUT, 'GET', `/groups/${groupId}`)).status).toBe(404)
    expect((await call(OUT, 'GET', '/groups')).body.groups).toEqual([])
    const add = await call(OUT, 'POST', `/groups/${groupId}/expenses`, {
      paidBy: OUT, description: 'x', amountCents: 100, date: '2026-01-01', participantIds: [OUT],
    })
    expect(add.status).toBe(404)
  })

  it('S2: equal split puts remainder cents on the first members and shares sum to the amount', async () => {
    const res = await call(ANA, 'POST', `/groups/${groupId}/expenses`, {
      paidBy: ANA, description: 'Cena', amountCents: 1000, date: '2026-01-01',
      participantIds: [ANA, BEN, CAM],
    })
    expect(res.status).toBe(201)
    const shares = res.body.expense.splits.map((s: { shareCents: number }) => s.shareCents)
    expect(shares).toEqual([334, 333, 333])
  })

  it('S2: custom splits are stored; wrong sum and non-member participants are rejected', async () => {
    const ok = await call(BEN, 'POST', `/groups/${groupId}/expenses`, {
      paidBy: BEN, description: 'Taxi', amountCents: 900, date: '2026-01-02',
      splits: [{ userId: ANA, shareCents: 600 }, { userId: BEN, shareCents: 300 }],
    })
    expect(ok.status).toBe(201)

    const badSum = await call(BEN, 'POST', `/groups/${groupId}/expenses`, {
      paidBy: BEN, description: 'Taxi', amountCents: 900, date: '2026-01-02',
      splits: [{ userId: ANA, shareCents: 100 }],
    })
    expect(badSum.status).toBe(400)

    const outsider = await call(ANA, 'POST', `/groups/${groupId}/expenses`, {
      paidBy: ANA, description: 'x', amountCents: 100, date: '2026-01-02', participantIds: [ANA, OUT],
    })
    expect(outsider.status).toBe(400)
  })

  it('S3/S4: balances net out, debts are listed, and a settlement updates them', async () => {
    // Ana paid 1000 (shares 334/333/333); Ben paid 900 (Ana 600, Ben 300).
    const before = (await call(CAM, 'GET', `/groups/${groupId}`)).body
    expect(before.balances.balances).toEqual({ [ANA]: 1000 - 334 - 600, [BEN]: 900 - 333 - 300, [CAM]: -333 })
    const total = Object.values(before.balances.balances as Record<string, number>).reduce((a, b) => a + b, 0)
    expect(total).toBe(0)
    expect(before.balances.debts).toEqual([{ from: CAM, to: BEN, amountCents: 267 }, { from: CAM, to: ANA, amountCents: 66 }])

    const settle = await call(CAM, 'POST', `/groups/${groupId}/settlements`, {
      fromUserId: CAM, toUserId: BEN, amountCents: 267, date: '2026-01-03',
    })
    expect(settle.status).toBe(201)
    const after = (await call(CAM, 'GET', `/groups/${groupId}`)).body
    expect(after.balances.balances[CAM]).toBe(-66)
    expect(after.balances.balances[BEN]).toBe(0)

    const mine = async (as: string) => (await call(as, 'GET', '/groups')).body.groups[0].myBalanceCents
    expect([await mine(ANA), await mine(CAM)]).toEqual([66, -66])

    const self = await call(CAM, 'POST', `/groups/${groupId}/settlements`, {
      fromUserId: CAM, toUserId: CAM, amountCents: 1, date: '2026-01-03',
    })
    expect(self.status).toBe(400)
  })

  it('S2/S5: only the payer or creator can edit an expense; the edit replaces its shares and moves balances', async () => {
    const find = async () =>
      (await call(ANA, 'GET', `/groups/${groupId}`)).body.expenses.find((e: { description: string }) => e.description === 'Taxi')
    const taxi = await find()
    const path = `/groups/${groupId}/expenses/${taxi.id}`
    const edit = { paidBy: BEN, description: 'Taxi', amountCents: 800, date: '2026-01-02', participantIds: [BEN, CAM] }

    expect((await call(CAM, 'PUT', path, edit)).status).toBe(403)
    expect((await call(OUT, 'PUT', path, edit)).status).toBe(404)
    expect((await call(BEN, 'PUT', path, { ...edit, participantIds: [BEN, OUT] })).status).toBe(400)
    expect((await call(BEN, 'PUT', path, { ...edit, splits: [{ userId: BEN, shareCents: 1 }] })).status).toBe(400)

    const ok = await call(BEN, 'PUT', path, edit)
    expect(ok.status).toBe(200)
    expect(ok.body.expense.splits).toEqual([{ userId: BEN, shareCents: 400 }, { userId: CAM, shareCents: 400 }])
    const after = await find()
    expect(after.amountCents).toBe(800)
    expect(after.splits).toHaveLength(2)

    // Ana no longer owes Ben for the taxi: only the 'Cena' (+666) and the 267 settlement remain in her balance.
    const balances = (await call(ANA, 'GET', `/groups/${groupId}`)).body.balances.balances
    expect(Object.values(balances as Record<string, number>).reduce((a, b) => a + b, 0)).toBe(0)
    expect(balances[ANA]).toBe(1000 - 334)
  })

  it('S5: only the payer or creator can delete an expense', async () => {
    const [taxi] = (await call(ANA, 'GET', `/groups/${groupId}`)).body.expenses.filter(
      (e: { description: string }) => e.description === 'Taxi',
    )
    expect((await call(CAM, 'DELETE', `/groups/${groupId}/expenses/${taxi.id}`)).status).toBe(403)
    expect((await call(BEN, 'DELETE', `/groups/${groupId}/expenses/${taxi.id}`)).status).toBe(200)
    const left = (await call(ANA, 'GET', `/groups/${groupId}`)).body.expenses
    expect(left.map((e: { description: string }) => e.description)).toEqual(['Cena'])
  })
})
