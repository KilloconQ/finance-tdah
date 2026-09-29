import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { and, eq, ne, sql } from 'drizzle-orm'
import {
  adjustEnvelopeSchema,
  createEnvelopeSchema,
  idParamSchema,
  updateEnvelopeSchema,
} from '@finance-tdah/shared/schemas'
import {
  envelopeAdjustmentError,
  unassignedCents,
  type EnvelopeAdjustmentError,
} from '@finance-tdah/shared/domain'
import { db, schema, type Tx } from '../db/client'
import { sessionMiddleware, type SessionVariables } from '../middleware/session'

const MXN = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })
const money = (cents: number) => MXN.format(cents / 100).replace('MX$', '$')

class EnvelopeRuleError extends Error {
  constructor(
    readonly code: EnvelopeAdjustmentError,
    readonly unassignedCents: number,
    readonly envelopeBalanceCents: number,
  ) {
    super(code)
  }
}

function ruleMessage(err: EnvelopeRuleError): string {
  switch (err.code) {
    case 'CREDIT_ACCOUNT':
      return 'Las tarjetas de crédito no llevan cajitas: su saldo es deuda.'
    case 'EXCEEDS_UNASSIGNED':
      return err.unassignedCents > 0
        ? `No te alcanza: en esta cuenta solo quedan ${money(err.unassignedCents)} sin apartar.`
        : 'No te alcanza: ya apartaste todo lo que tiene esta cuenta.'
    case 'EXCEEDS_ENVELOPE':
      return err.envelopeBalanceCents > 0
        ? `La cajita solo tiene ${money(err.envelopeBalanceCents)}.`
        : 'La cajita no tiene dinero para liberar.'
  }
}

/**
 * Locks the account row for the rest of the transaction. Every write that
 * changes what an account holds or has set aside (envelope moves here,
 * expenses in `expenses.ts`) touches this row first, so two concurrent moves
 * can't both see the same unassigned money and set it aside twice.
 */
async function lockAccount(tx: Tx, accountId: string, userId: string) {
  const [account] = await tx
    .select({
      id: schema.financialAccount.id,
      type: schema.financialAccount.type,
      balanceCents: schema.financialAccount.balanceCents,
    })
    .from(schema.financialAccount)
    .where(and(eq(schema.financialAccount.id, accountId), eq(schema.financialAccount.userId, userId)))
    .for('update')
  return account ?? null
}

async function otherEnvelopeBalances(tx: Tx, accountId: string, exceptId: string | null) {
  const rows = await tx
    .select({ balanceCents: schema.envelope.balanceCents })
    .from(schema.envelope)
    .where(
      exceptId
        ? and(eq(schema.envelope.accountId, accountId), ne(schema.envelope.id, exceptId))
        : eq(schema.envelope.accountId, accountId),
    )
  return rows.map((r) => r.balanceCents)
}

function assertAdjustment(
  account: { type: (typeof schema.financialAccount.$inferSelect)['type']; balanceCents: number },
  others: number[],
  envelopeBalanceCents: number,
  deltaCents: number,
) {
  const code = envelopeAdjustmentError({
    accountType: account.type,
    accountBalanceCents: account.balanceCents,
    otherEnvelopeBalancesCents: others,
    envelopeBalanceCents,
    deltaCents,
  })
  if (code) {
    throw new EnvelopeRuleError(
      code,
      unassignedCents(account.balanceCents, [...others, envelopeBalanceCents]),
      envelopeBalanceCents,
    )
  }
}

export const envelopesRoute = new Hono<{ Variables: SessionVariables }>()
  .use('*', sessionMiddleware)

  .get('/', async (c) => {
    const user = c.get('user')
    const envelopes = await db.query.envelope.findMany({
      where: (e, { eq }) => eq(e.userId, user.id),
      orderBy: (e, { asc }) => [asc(e.createdAt)],
    })
    return c.json({ envelopes })
  })

  .post('/', zValidator('json', createEnvelopeSchema), async (c) => {
    const user = c.get('user')
    const input = c.req.valid('json')

    try {
      const created = await db.transaction(async (tx) => {
        const account = await lockAccount(tx, input.accountId, user.id)
        if (!account) return null
        assertAdjustment(account, await otherEnvelopeBalances(tx, account.id, null), 0, input.amountCents)

        const [row] = await tx
          .insert(schema.envelope)
          .values({
            userId: user.id,
            accountId: account.id,
            name: input.name,
            emoji: input.emoji,
            balanceCents: input.amountCents,
          })
          .returning()
        return row
      })

      if (!created) return c.json({ error: 'Cuenta no encontrada' }, 404)
      return c.json({ envelope: created }, 201)
    } catch (err) {
      if (err instanceof EnvelopeRuleError) return c.json({ error: ruleMessage(err) }, 422)
      throw err
    }
  })

  .patch('/:id', zValidator('param', idParamSchema), zValidator('json', updateEnvelopeSchema), async (c) => {
    const user = c.get('user')
    const { id } = c.req.valid('param')
    const patch = c.req.valid('json')

    const [updated] = await db
      .update(schema.envelope)
      .set({ ...patch, updatedAt: new Date() })
      .where(and(eq(schema.envelope.id, id), eq(schema.envelope.userId, user.id)))
      .returning()

    if (!updated) return c.json({ error: 'Cajita no encontrada' }, 404)
    return c.json({ envelope: updated })
  })

  .post(
    '/:id/adjust',
    zValidator('param', idParamSchema),
    zValidator('json', adjustEnvelopeSchema),
    async (c) => {
      const user = c.get('user')
      const { id } = c.req.valid('param')
      const { deltaCents } = c.req.valid('json')

      try {
        const updated = await db.transaction(async (tx) => {
          const found = await tx.query.envelope.findFirst({
            where: (e, { and, eq }) => and(eq(e.id, id), eq(e.userId, user.id)),
            columns: { accountId: true },
          })
          if (!found) return null

          const account = await lockAccount(tx, found.accountId, user.id)
          if (!account) return null
          // Re-read under the lock: an expense may have changed it meanwhile.
          const envelope = await tx.query.envelope.findFirst({
            where: (e, { eq }) => eq(e.id, id),
            columns: { balanceCents: true },
          })
          if (!envelope) return null

          assertAdjustment(account, await otherEnvelopeBalances(tx, account.id, id), envelope.balanceCents, deltaCents)

          const [row] = await tx
            .update(schema.envelope)
            .set({ balanceCents: sql`${schema.envelope.balanceCents} + ${deltaCents}`, updatedAt: new Date() })
            .where(eq(schema.envelope.id, id))
            .returning()
          return row
        })

        if (!updated) return c.json({ error: 'Cajita no encontrada' }, 404)
        return c.json({ envelope: updated })
      } catch (err) {
        if (err instanceof EnvelopeRuleError) return c.json({ error: ruleMessage(err) }, 422)
        throw err
      }
    },
  )

  // The money stays in the account, just no longer set aside. Expenses paid
  // from it keep their history; the FK clears their `envelopeId`.
  .delete('/:id', zValidator('param', idParamSchema), async (c) => {
    const user = c.get('user')
    const { id } = c.req.valid('param')

    const [deleted] = await db
      .delete(schema.envelope)
      .where(and(eq(schema.envelope.id, id), eq(schema.envelope.userId, user.id)))
      .returning()

    if (!deleted) return c.json({ error: 'Cajita no encontrada' }, 404)
    return c.json({ ok: true })
  })
