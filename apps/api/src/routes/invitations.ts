import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { and, count, desc, eq, gt, sql } from 'drizzle-orm'
import { addMemberSchema, idParamSchema } from '@finance-tdah/shared/schemas'
import { db, schema } from '../db/client'
import { sessionMiddleware, type SessionVariables } from '../middleware/session'
import { sendAppInvitationEmail } from '../services/invitation-email'

const { expenseGroupInvitation: invitation } = schema

const NOT_FOUND = { error: 'Invitación no encontrada' }

const { appInvitationLog: log } = schema

/**
 * Records one event under (`scope`, `key`) unless it already has `limit` in the last day.
 * The counts live in Postgres so they survive restarts and are shared by every API instance;
 * the advisory lock serializes concurrent claims on the same key, so the limit can't be raced.
 */
async function allow(scope: 'sender' | 'address', key: string, limit: number): Promise<boolean> {
  return db.transaction(async (tx) => {
    // Sweep a bounded batch of expired rows so the table stays small. SKIP LOCKED keeps two sweeps from deadlocking.
    await tx.execute(sql`
      delete from ${log} where id in (
        select id from ${log} where ${log.createdAt} < now() - interval '1 day' limit 100 for update skip locked
      )`)
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`${scope}:${key}`}))`)
    const [{ recent }] = await tx
      .select({ recent: count() })
      .from(log)
      .where(and(eq(log.scope, scope), eq(log.key, key), gt(log.createdAt, sql`now() - interval '1 day'`)))
    if (recent >= limit) return false
    await tx.insert(log).values({ scope, key })
    return true
  })
}

/** The invitation if it's still pending and addressed to `userId`; anyone else gets the same miss. */
const pendingFor = (id: string, userId: string) =>
  and(eq(invitation.id, id), eq(invitation.inviteeId, userId), eq(invitation.status, 'pending'))

export const invitationsRoute = new Hono<{ Variables: SessionVariables }>()
  .use('*', sessionMiddleware)

  .get('/', async (c) => {
    const user = c.get('user')
    const invitations = await db
      .select({
        id: invitation.id,
        groupId: invitation.groupId,
        groupName: schema.expenseGroup.name,
        invitedByName: schema.user.name,
        createdAt: invitation.createdAt,
      })
      .from(invitation)
      .innerJoin(schema.expenseGroup, eq(schema.expenseGroup.id, invitation.groupId))
      .innerJoin(schema.user, eq(schema.user.id, invitation.invitedBy))
      .where(and(eq(invitation.inviteeId, user.id), eq(invitation.status, 'pending')))
      .orderBy(desc(invitation.createdAt))
    return c.json({ invitations })
  })

  // Same answer whether or not the address already has an account, so emails can't be enumerated.
  // The cap per user keeps us from being a spam relay; the one per address keeps many accounts from flooding one inbox.
  .post('/app', zValidator('json', addMemberSchema), async (c) => {
    const user = c.get('user')
    const { email } = c.req.valid('json')
    if (!(await allow('sender', user.id, 10))) {
      return c.json({ error: 'Llegaste al límite de invitaciones por hoy. Intenta mañana.' }, 429)
    }
    // Both reads run for every address, account or not, so the response time doesn't give away which it is.
    const [existing, firstToday] = await Promise.all([
      db.query.user.findFirst({ columns: { id: true }, where: (u, { eq }) => eq(u.email, email) }),
      allow('address', email, 1),
    ])
    // Not awaited, for the same reason.
    if (!existing && firstToday) void sendAppInvitationEmail({ to: email, inviterName: user.name })
    return c.json({ ok: true }, 202)
  })

  .post('/:id/accept', zValidator('param', idParamSchema), async (c) => {
    const user = c.get('user')
    const { id } = c.req.valid('param')
    // Deleting is what claims the invitation, so two taps can't both join.
    const groupId = await db.transaction(async (tx) => {
      const [claimed] = await tx.delete(invitation).where(pendingFor(id, user.id)).returning({ groupId: invitation.groupId })
      if (!claimed) return null
      await tx
        .insert(schema.expenseGroupMember)
        .values({ groupId: claimed.groupId, userId: user.id })
        .onConflictDoNothing()
      return claimed.groupId
    })
    if (!groupId) return c.json(NOT_FOUND, 404)
    return c.json({ groupId })
  })

  .post('/:id/decline', zValidator('param', idParamSchema), async (c) => {
    const user = c.get('user')
    const { id } = c.req.valid('param')
    const [declined] = await db
      .update(invitation)
      .set({ status: 'declined' })
      .where(pendingFor(id, user.id))
      .returning({ id: invitation.id })
    if (!declined) return c.json(NOT_FOUND, 404)
    return c.json({ ok: true })
  })
