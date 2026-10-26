import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { and, eq, ne, sql } from 'drizzle-orm'
import {
  MAX_CENTS,
  addMemberSchema,
  createGroupSchema,
  createSettlementSchema,
  createSharedExpenseSchema,
  idParamSchema,
} from '@finance-tdah/shared/schemas'
import { computeBalances, simplifyDebts, splitEqual } from '@finance-tdah/shared/domain'
import { z } from 'zod'
import { db, schema } from '../db/client'
import { sessionMiddleware, type SessionVariables } from '../middleware/session'
import { sendGroupInvitationEmail } from '../services/invitation-email'

const expenseParamSchema = z.object({ id: z.uuid(), expenseId: z.uuid() })

async function memberIds(groupId: string): Promise<string[]> {
  const rows = await db
    .select({ userId: schema.expenseGroupMember.userId })
    .from(schema.expenseGroupMember)
    .where(eq(schema.expenseGroupMember.groupId, groupId))
  return rows.map((r) => r.userId)
}

async function loadMembers(groupId: string) {
  return db
    .select({ userId: schema.user.id, name: schema.user.name, email: schema.user.email })
    .from(schema.expenseGroupMember)
    .innerJoin(schema.user, eq(schema.user.id, schema.expenseGroupMember.userId))
    .where(eq(schema.expenseGroupMember.groupId, groupId))
    .orderBy(schema.expenseGroupMember.joinedAt)
}

/** The expense's shares (equal split unless custom ones were sent), or null if anyone involved isn't a member. */
async function resolveSplits(groupId: string, input: z.infer<typeof createSharedExpenseSchema>) {
  const members = new Set(await memberIds(groupId))
  const splits = input.splits ?? splitEqual(input.amountCents, [...new Set(input.participantIds)])
  const involved = [input.paidBy, ...splits.map((s) => s.userId)]
  if (involved.some((u) => !members.has(u)) || new Set(splits.map((s) => s.userId)).size !== splits.length) return null
  return splits
}

/** The expense if it's in the group and `userId` paid or created it; otherwise the error to send. */
async function loadOwnedExpense(groupId: string, expenseId: string, userId: string, verb: string) {
  const expense = await db.query.sharedExpense.findFirst({
    where: (e, { and, eq }) => and(eq(e.id, expenseId), eq(e.groupId, groupId)),
  })
  if (!expense) return { error: 'Gasto no encontrado', status: 404 } as const
  if (expense.paidBy !== userId && expense.createdBy !== userId) {
    return { error: `Solo quien pagó o cargó el gasto puede ${verb}`, status: 403 } as const
  }
  return { expense }
}

const TOTAL_TOO_BIG = 'El total del grupo es demasiado grande'

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]

/**
 * Locks the group row (so concurrent writers queue) and says whether adding
 * `addCents` to the group's expenses, ignoring `exceptId`, would pass the cap.
 * Summed in SQL as bigint: an int32 sum could itself overflow.
 */
async function totalWouldOverflow(tx: Tx, groupId: string, addCents: number, exceptId?: string) {
  await tx.select({ id: schema.expenseGroup.id }).from(schema.expenseGroup).where(eq(schema.expenseGroup.id, groupId)).for('update')
  const [row] = await tx
    .select({ total: sql<string>`coalesce(sum(${schema.sharedExpense.amountCents}::bigint), 0)` })
    .from(schema.sharedExpense)
    .where(
      exceptId
        ? and(eq(schema.sharedExpense.groupId, groupId), ne(schema.sharedExpense.id, exceptId))
        : eq(schema.sharedExpense.groupId, groupId),
    )
  return Number(row.total) + addCents > MAX_CENTS
}

async function groupBalances(groupId: string) {
  const [expenses, settlements] = await Promise.all([
    db.query.sharedExpense.findMany({ where: (e, { eq }) => eq(e.groupId, groupId), with: { splits: true } }),
    db.query.settlement.findMany({ where: (s, { eq }) => eq(s.groupId, groupId) }),
  ])
  return computeBalances({ expenses, settlements })
}

export const groupsRoute = new Hono<{ Variables: SessionVariables }>()
  .use('*', sessionMiddleware)

  .get('/', async (c) => {
    const user = c.get('user')
    const rows = await db
      .select({ group: schema.expenseGroup })
      .from(schema.expenseGroupMember)
      .innerJoin(schema.expenseGroup, eq(schema.expenseGroup.id, schema.expenseGroupMember.groupId))
      .where(eq(schema.expenseGroupMember.userId, user.id))
      .orderBy(schema.expenseGroup.createdAt)
    const groups = await Promise.all(
      rows.map(async ({ group }) => ({
        ...group,
        ...(await Promise.all([loadMembers(group.id), groupBalances(group.id)]).then(([members, bal]) => ({
          members,
          myBalanceCents: bal[user.id] ?? 0,
        }))),
      })),
    )
    return c.json({ groups })
  })

  .post('/', zValidator('json', createGroupSchema), async (c) => {
    const user = c.get('user')
    const { name } = c.req.valid('json')
    const group = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(schema.expenseGroup)
        .values({ name, createdBy: user.id })
        .returning()
      await tx.insert(schema.expenseGroupMember).values({ groupId: created.id, userId: user.id })
      return created
    })
    return c.json({ group: { ...group, members: await loadMembers(group.id), myBalanceCents: 0 } }, 201)
  })

  // Every route below is member-only; non-members get the same 404 as a missing group.
  .use('/:id/*', async (c, next) => {
    const user = c.get('user')
    const id = c.req.param('id')
    if (!z.uuid().safeParse(id).success) return c.json({ error: 'Grupo no encontrado' }, 404)
    const [row] = await db
      .select({ userId: schema.expenseGroupMember.userId })
      .from(schema.expenseGroupMember)
      .where(and(eq(schema.expenseGroupMember.groupId, id), eq(schema.expenseGroupMember.userId, user.id)))
    if (!row) return c.json({ error: 'Grupo no encontrado' }, 404)
    await next()
  })

  .get('/:id', zValidator('param', idParamSchema), async (c) => {
    const user = c.get('user')
    const { id } = c.req.valid('param')
    const [group, members, expenseRows, settlements] = await Promise.all([
      db.query.expenseGroup.findFirst({ where: (g, { eq }) => eq(g.id, id) }),
      loadMembers(id),
      db.query.sharedExpense.findMany({
        where: (e, { eq }) => eq(e.groupId, id),
        with: { splits: true },
        orderBy: (e, { desc }) => [desc(e.date), desc(e.createdAt)],
      }),
      db.query.settlement.findMany({
        where: (s, { eq }) => eq(s.groupId, id),
        orderBy: (s, { desc }) => [desc(s.date), desc(s.createdAt)],
      }),
    ])
    if (!group) return c.json({ error: 'Grupo no encontrado' }, 404)
    const expenses = expenseRows.map((e) => ({
      ...e,
      splits: e.splits.map((s) => ({ userId: s.userId, shareCents: s.shareCents })),
    }))
    const balances = computeBalances({ expenses, settlements })
    for (const m of members) balances[m.userId] ??= 0
    return c.json({
      group: { ...group, members, myBalanceCents: balances[user.id] ?? 0 },
      expenses,
      settlements,
      balances: { balances, debts: simplifyDebts(balances) },
    })
  })

  // Adding someone is an invitation they accept or decline (see routes/invitations.ts); it never makes them a member.
  .post('/:id/invitations', zValidator('param', idParamSchema), zValidator('json', addMemberSchema), async (c) => {
    const user = c.get('user')
    const { id } = c.req.valid('param')
    const { email } = c.req.valid('json')
    // The group is read up front, in parallel, so the reply takes as long whether or not an invitation goes out.
    const [target, members, group] = await Promise.all([
      db.query.user.findFirst({ where: (u, { eq }) => eq(u.email, email) }),
      loadMembers(id),
      db.query.expenseGroup.findFirst({ columns: { name: true }, where: (g, { eq }) => eq(g.id, id) }),
    ])
    // Same answer (201 + members) whether or not the account exists, so emails can't be enumerated.
    if (target && !members.some((m) => m.userId === target.id)) {
      const [created] = await db
        .insert(schema.expenseGroupInvitation)
        .values({ groupId: id, invitedBy: user.id, inviteeId: target.id })
        .onConflictDoNothing()
        .returning({ id: schema.expenseGroupInvitation.id })
      // Only a new invitation sends mail: a pending or declined one stays quiet. Not awaited, so the
      // response time doesn't give away whether the address has an account.
      if (created && group) void sendGroupInvitationEmail({ to: target.email, inviterName: user.name, groupName: group.name })
    }
    return c.json({ members }, 201)
  })

  .delete('/:id/members/me', zValidator('param', idParamSchema), async (c) => {
    const user = c.get('user')
    const { id } = c.req.valid('param')
    const balances = await groupBalances(id)
    if ((balances[user.id] ?? 0) !== 0) return c.json({ error: 'Salda tus deudas antes de salir' }, 409)
    const members = await memberIds(id)
    if (members.length <= 1) {
      await db.delete(schema.expenseGroup).where(eq(schema.expenseGroup.id, id))
    } else {
      await db
        .delete(schema.expenseGroupMember)
        .where(and(eq(schema.expenseGroupMember.groupId, id), eq(schema.expenseGroupMember.userId, user.id)))
    }
    return c.json({ ok: true })
  })

  .post('/:id/expenses', zValidator('param', idParamSchema), zValidator('json', createSharedExpenseSchema), async (c) => {
    const user = c.get('user')
    const { id } = c.req.valid('param')
    const input = c.req.valid('json')

    const splits = await resolveSplits(id, input)
    if (!splits) return c.json({ error: 'Todos deben ser miembros del grupo' }, 400)

    const expense = await db.transaction(async (tx) => {
      if (await totalWouldOverflow(tx, id, input.amountCents)) return null
      const [created] = await tx
        .insert(schema.sharedExpense)
        .values({
          groupId: id,
          paidBy: input.paidBy,
          description: input.description,
          amountCents: input.amountCents,
          date: input.date,
          createdBy: user.id,
        })
        .returning()
      await tx.insert(schema.sharedExpenseSplit).values(splits.map((s) => ({ ...s, expenseId: created.id })))
      return created
    })
    if (!expense) return c.json({ error: TOTAL_TOO_BIG }, 400)
    return c.json({ expense: { ...expense, splits } }, 201)
  })

  // Full replacement (same body as create), so no partial-update defaults can leak into stored data.
  .put('/:id/expenses/:expenseId', zValidator('param', expenseParamSchema), zValidator('json', createSharedExpenseSchema), async (c) => {
    const user = c.get('user')
    const { id, expenseId } = c.req.valid('param')
    const input = c.req.valid('json')
    const owned = await loadOwnedExpense(id, expenseId, user.id, 'editarlo')
    if ('error' in owned) return c.json({ error: owned.error }, owned.status)
    const splits = await resolveSplits(id, input)
    if (!splits) return c.json({ error: 'Todos deben ser miembros del grupo' }, 400)

    const updated = await db.transaction(async (tx) => {
      if (await totalWouldOverflow(tx, id, input.amountCents, expenseId)) return null
      const [row] = await tx
        .update(schema.sharedExpense)
        .set({ paidBy: input.paidBy, description: input.description, amountCents: input.amountCents, date: input.date })
        .where(eq(schema.sharedExpense.id, expenseId))
        .returning()
      await tx.delete(schema.sharedExpenseSplit).where(eq(schema.sharedExpenseSplit.expenseId, expenseId))
      await tx.insert(schema.sharedExpenseSplit).values(splits.map((s) => ({ ...s, expenseId })))
      return row
    })
    if (!updated) return c.json({ error: TOTAL_TOO_BIG }, 400)
    return c.json({ expense: { ...updated, splits } })
  })

  .delete('/:id/expenses/:expenseId', zValidator('param', expenseParamSchema), async (c) => {
    const user = c.get('user')
    const { id, expenseId } = c.req.valid('param')
    const owned = await loadOwnedExpense(id, expenseId, user.id, 'borrarlo')
    if ('error' in owned) return c.json({ error: owned.error }, owned.status)
    await db.delete(schema.sharedExpense).where(eq(schema.sharedExpense.id, expenseId))
    return c.json({ ok: true })
  })

  .post('/:id/settlements', zValidator('param', idParamSchema), zValidator('json', createSettlementSchema), async (c) => {
    const { id } = c.req.valid('param')
    const input = c.req.valid('json')
    const members = new Set(await memberIds(id))
    if (!members.has(input.fromUserId) || !members.has(input.toUserId)) {
      return c.json({ error: 'Todos deben ser miembros del grupo' }, 400)
    }
    const owed =
      simplifyDebts(await groupBalances(id)).find((d) => d.from === input.fromUserId && d.to === input.toUserId)
        ?.amountCents ?? 0
    if (input.amountCents > owed) return c.json({ error: 'El pago no puede superar lo que se debe' }, 400)
    const [settlement] = await db
      .insert(schema.settlement)
      .values({ groupId: id, ...input })
      .returning()
    return c.json({ settlement }, 201)
  })
