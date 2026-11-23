import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { Hono } from 'hono'
import { createCaller, dropUsers, seedUsers, testEmail, testUserIds } from '../test/integration'

/**
 * Group invitations on a real, migrated Postgres (opt-in like the other
 * integration tests):
 *
 *   TEST_DATABASE_URL=postgres://… pnpm --filter @finance-tdah/api test
 */
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL

const { sendEmail, sendAppEmail } = vi.hoisted(() => ({ sendEmail: vi.fn(), sendAppEmail: vi.fn() }))

vi.mock('../services/invitation-email', () => ({
  sendGroupInvitationEmail: sendEmail,
  sendAppInvitationEmail: sendAppEmail,
}))

vi.mock('../env', () => ({
  env: { DATABASE_URL: process.env.TEST_DATABASE_URL ?? 'postgres://unused', NODE_ENV: 'test' },
  features: { passwordResetEmail: false, webPush: false },
}))

vi.mock('../middleware/session', () => ({
  sessionMiddleware: async (
    c: { req: { header: (k: string) => string | undefined }; set: (k: string, v: unknown) => void },
    next: () => Promise<void>,
  ) => {
    const id = c.req.header('x-test-user')
    c.set('user', { id, name: `Name of ${id}` })
    await next()
  },
}))

describe.skipIf(!TEST_DATABASE_URL)('group invitations (Postgres)', async () => {
  const { db, schema } = await import('../db/client')
  const { groupsRoute } = await import('./groups')
  const { invitationsRoute } = await import('./invitations')
  const { and, eq, inArray, lt, sql } = await import('drizzle-orm')

  const app = new Hono().route('/groups', groupsRoute).route('/invitations', invitationsRoute)
  const [ANA, BEN, CAM, OUT] = testUserIds('i', ['ana', 'ben', 'cam', 'out'])
  const email = testEmail
  const run = ANA.split('-')[0]
  // Unique per run: the limits live in Postgres now, so a fixed address would remember earlier runs.
  const addr = (name: string) => `${name}-${run}@test.local`
  const call = createCaller(app)

  const invite = (as: string, groupId: string, who: string) =>
    call(as, 'POST', `/groups/${groupId}/invitations`, { email: email(who) })
  const pending = async (as: string) => (await call(as, 'GET', '/invitations')).body.invitations as any[]
  const groupIdsOf = async (as: string) =>
    ((await call(as, 'GET', '/groups')).body.groups as { id: string }[]).map((g) => g.id)

  beforeAll(async () => {
    await seedUsers(db, schema, [ANA, BEN, CAM, OUT], (id) => `Name of ${id}`)
  })

  afterAll(async () => {
    await dropUsers(db, schema, [ANA, BEN, CAM, OUT])
  })

  beforeEach(() => {
    sendEmail.mockReset()
    sendAppEmail.mockReset()
  })

  describe('to a group', () => {
    let groupId: string

    // Dropping ANA's groups (memberships and invitations cascade) plus a fresh one keeps state from leaking between tests.
    beforeEach(async () => {
      await db.delete(schema.expenseGroup).where(eq(schema.expenseGroup.createdBy, ANA))
      groupId = (await call(ANA, 'POST', '/groups', { name: 'Viaje' })).body.group.id
    })

    it('S1: inviting an existing account creates a pending invitation, not a membership, and sends one email', async () => {
      const res = await invite(ANA, groupId, BEN)

      expect(res.status).toBe(201)
      expect(res.body.members.map((m: { userId: string }) => m.userId)).toEqual([ANA])
      expect(await groupIdsOf(BEN)).toEqual([])

      const [inv] = await pending(BEN)
      expect(inv).toMatchObject({ groupId, groupName: 'Viaje', invitedByName: `Name of ${ANA}` })
      expect(sendEmail).toHaveBeenCalledTimes(1)
      expect(sendEmail).toHaveBeenCalledWith({
        to: email(BEN),
        inviterName: `Name of ${ANA}`,
        groupName: 'Viaje',
      })
    })

    it('S2: an address with no account gets the same answer as one with an account, and no email', async () => {
      const known = await invite(ANA, groupId, BEN)
      sendEmail.mockClear()
      const missing = await call(ANA, 'POST', `/groups/${groupId}/invitations`, { email: 'nadie@test.local' })

      expect(missing.status).toBe(known.status)
      expect(missing.body).toEqual(known.body)
      expect(sendEmail).not.toHaveBeenCalled()
    })

    it('S3: inviting someone twice keeps one invitation and sends one email', async () => {
      await invite(ANA, groupId, BEN)
      await invite(ANA, groupId, BEN)

      expect(await pending(BEN)).toHaveLength(1)
      expect(sendEmail).toHaveBeenCalledTimes(1)
    })

    it('S4: accepting joins the group, consumes the invitation, and cannot be repeated', async () => {
      await invite(ANA, groupId, BEN)
      const [inv] = await pending(BEN)

      const accepted = await call(BEN, 'POST', `/invitations/${inv.id}/accept`)
      expect(accepted.status).toBe(200)
      expect(accepted.body).toEqual({ groupId })
      expect(await groupIdsOf(BEN)).toEqual([groupId])
      expect(await pending(BEN)).toEqual([])

      expect((await call(BEN, 'POST', `/invitations/${inv.id}/accept`)).status).toBe(404)
    })

    it('S5: declining keeps them out, and the group cannot re-invite them', async () => {
      await invite(ANA, groupId, BEN)
      const [inv] = await pending(BEN)

      expect((await call(BEN, 'POST', `/invitations/${inv.id}/decline`)).status).toBe(200)
      expect(await pending(BEN)).toEqual([])
      expect(await groupIdsOf(BEN)).toEqual([])
      expect((await call(BEN, 'POST', `/invitations/${inv.id}/accept`)).status).toBe(404)

      sendEmail.mockClear()
      await invite(ANA, groupId, BEN)
      expect(await pending(BEN)).toEqual([])
      expect(sendEmail).not.toHaveBeenCalled()
    })

    it('S6: only the invitee can answer an invitation', async () => {
      await invite(ANA, groupId, BEN)
      const [inv] = await pending(BEN)

      for (const action of ['accept', 'decline']) {
        expect((await call(OUT, 'POST', `/invitations/${inv.id}/${action}`)).status).toBe(404)
        expect((await call(ANA, 'POST', `/invitations/${inv.id}/${action}`)).status).toBe(404)
      }
      expect(await pending(BEN)).toHaveLength(1)
      expect(await groupIdsOf(OUT)).toEqual([])
    })

    it('S7: you only list your own pending invitations', async () => {
      await invite(ANA, groupId, BEN)
      await invite(ANA, groupId, CAM)

      expect(await pending(BEN)).toHaveLength(1)
      expect(await pending(CAM)).toHaveLength(1)
      expect(await pending(OUT)).toEqual([])
    })

    it('S8: inviting a current member, or inviting yourself, sends nothing', async () => {
      await invite(ANA, groupId, ANA)
      await invite(ANA, groupId, BEN)
      await call(BEN, 'POST', `/invitations/${(await pending(BEN))[0].id}/accept`)
      sendEmail.mockClear()

      await invite(ANA, groupId, BEN)
      await invite(ANA, groupId, ANA)

      expect(sendEmail).not.toHaveBeenCalled()
      expect(await pending(BEN)).toEqual([])
      expect(await pending(ANA)).toEqual([])
    })

    it('S9: a non-member cannot invite anyone', async () => {
      const res = await invite(OUT, groupId, BEN)

      expect(res.status).toBe(404)
      expect(await pending(BEN)).toEqual([])
      expect(sendEmail).not.toHaveBeenCalled()
    })

    it('S10: deleting the group drops its pending invitations', async () => {
      await invite(ANA, groupId, BEN)
      await db.delete(schema.expenseGroup).where(eq(schema.expenseGroup.id, groupId))

      expect(await pending(BEN)).toEqual([])
    })
  })

  describe('to Cada Quien', () => {
    describe('limits kept in Postgres', () => {
      const log = schema.appInvitationLog
      const rowsOf = (scope: string, keys: string[]) =>
        db.select().from(log).where(and(eq(log.scope, scope), inArray(log.key, keys)))
      const ago = (hours: number) => new Date(Date.now() - hours * 3_600_000)

      afterAll(async () => {
        await db.delete(log).where(sql`${log.key} like ${run + '%'} or ${log.key} like ${'%-' + run + '@%'}`)
      })

      it('S1: counts made before a restart still apply (the sender is over the limit, nothing is sent or recorded)', async () => {
        const sender = `${run}-old-timer`
        await db.insert(log).values(Array.from({ length: 10 }, () => ({ scope: 'sender', key: sender, createdAt: ago(1) })))

        const res = await call(sender, 'POST', '/invitations/app', { email: addr('tarde') })

        expect(res.status).toBe(429)
        expect(res.body).toEqual({ error: 'Llegaste al límite de invitaciones por hoy. Intenta mañana.' })
        expect(sendAppEmail).not.toHaveBeenCalled()
        expect(await rowsOf('sender', [sender])).toHaveLength(10)
        expect(await rowsOf('address', [addr('tarde')])).toEqual([])
      })

      it('S1: an address mailed earlier today is not mailed again, but still gets the usual answer', async () => {
        await db.insert(log).values({ scope: 'address', key: addr('ya-enviada'), createdAt: ago(2) })

        const res = await call(`${run}-fresh-a`, 'POST', '/invitations/app', { email: addr('ya-enviada') })

        expect(res).toEqual({ status: 202, body: { ok: true } })
        expect(sendAppEmail).not.toHaveBeenCalled()
        expect(await rowsOf('address', [addr('ya-enviada')])).toHaveLength(1)
      })

      it('S1: entries older than a day stop counting and are swept, so the table does not grow without bound', async () => {
        const sender = `${run}-day-after`
        await db.insert(log).values([
          ...Array.from({ length: 10 }, () => ({ scope: 'sender', key: sender, createdAt: ago(25) })),
          { scope: 'address', key: addr('vieja'), createdAt: ago(25) },
        ])

        const res = await call(sender, 'POST', '/invitations/app', { email: addr('vieja') })

        expect(res).toEqual({ status: 202, body: { ok: true } })
        expect(sendAppEmail).toHaveBeenCalledTimes(1)
        expect(await rowsOf('sender', [sender])).toHaveLength(1)
        expect(await rowsOf('address', [addr('vieja')])).toHaveLength(1)
        expect(await db.select().from(log).where(lt(log.createdAt, ago(24)))).toEqual([])
      })

      it('S1: an invalid address uses no quota', async () => {
        const sender = `${run}-typo`
        await call(sender, 'POST', '/invitations/app', { email: 'no-es-correo' })

        expect(await rowsOf('sender', [sender])).toEqual([])
      })

      it('S1: concurrent requests from one user never go over the limit', async () => {
        const sender = `${run}-burst`
        const results = await Promise.all(
          Array.from({ length: 16 }, (_, i) => call(sender, 'POST', '/invitations/app', { email: addr(`rafaga${i}`) })),
        )

        expect(results.filter((r) => r.status === 202)).toHaveLength(10)
        expect(results.filter((r) => r.status === 429)).toHaveLength(6)
        expect(sendAppEmail).toHaveBeenCalledTimes(10)
        expect(await rowsOf('sender', [sender])).toHaveLength(10)
      })

      it('S1: concurrent requests for one new address send a single email', async () => {
        const senders = Array.from({ length: 8 }, (_, i) => `${run}-multi${i}`)
        const results = await Promise.all(
          senders.map((s) => call(s, 'POST', '/invitations/app', { email: addr('misma') })),
        )

        expect(results.every((r) => r.status === 202 && r.body.ok === true)).toBe(true)
        expect(sendAppEmail).toHaveBeenCalledTimes(1)
        expect(await rowsOf('address', [addr('misma')])).toHaveLength(1)
      })
    })

    it('S11: inviting an address with no account to Cada Quien emails it a sign-up link, with the same answer an account gets', async () => {
      const fresh = await call(ANA, 'POST', '/invitations/app', { email: addr('Nueva') })
      const known = await call(ANA, 'POST', '/invitations/app', { email: email(BEN) })

      expect(fresh.status).toBe(202)
      expect(known.status).toBe(fresh.status)
      expect(known.body).toEqual(fresh.body)
      expect(sendAppEmail).toHaveBeenCalledTimes(1)
      expect(sendAppEmail).toHaveBeenCalledWith({ to: addr('nueva'), inviterName: `Name of ${ANA}` })
    })

    it('S12: an invalid address is rejected and sends nothing', async () => {
      const res = await call(ANA, 'POST', '/invitations/app', { email: 'no-es-correo' })

      expect(res.status).toBe(400)
      expect(sendAppEmail).not.toHaveBeenCalled()
    })

    it('S13: each user can send a limited number of app invitations per day', async () => {
      for (let i = 0; i < 10; i++) {
        expect((await call(CAM, 'POST', '/invitations/app', { email: addr(`amigo${i}`) })).status).toBe(202)
      }
      sendAppEmail.mockClear()

      const res = await call(CAM, 'POST', '/invitations/app', { email: addr('otro') })
      expect(res.status).toBe(429)
      expect(res.body.error).toMatch(/límite/)
      expect(sendAppEmail).not.toHaveBeenCalled()
      expect((await call(BEN, 'POST', '/invitations/app', { email: addr('otro') })).status).toBe(202)
    })

    it('S14: an address gets at most one app invitation a day, whoever sends it, with the same answer every time', async () => {
      const first = await call(ANA, 'POST', '/invitations/app', { email: addr('repetida') })
      const again = await call(ANA, 'POST', '/invitations/app', { email: addr('repetida').toUpperCase() })
      const other = await call(BEN, 'POST', '/invitations/app', { email: addr('repetida') })

      expect(again).toEqual(first)
      expect(other).toEqual(first)
      expect(sendAppEmail).toHaveBeenCalledTimes(1)
    })
  })
})
