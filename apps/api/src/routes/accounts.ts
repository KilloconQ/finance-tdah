import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { and, eq } from 'drizzle-orm'
import {
  createFinancialAccountSchema,
  idParamSchema,
  updateFinancialAccountSchema,
} from '@finance-tdah/shared/schemas'
import { allocatedCents, signedBalanceForType, spendsLockedMoney } from '@finance-tdah/shared/domain'
import { db, schema } from '../db/client'
import { money } from '../lib/money'
import { sessionMiddleware, type SessionVariables } from '../middleware/session'

export const accountsRoute = new Hono<{ Variables: SessionVariables }>()
  .use('*', sessionMiddleware)

  .get('/', async (c) => {
    const user = c.get('user')
    const accounts = await db.query.financialAccount.findMany({
      where: (a, { eq }) => eq(a.userId, user.id),
      orderBy: (a, { asc }) => [asc(a.createdAt)],
    })
    return c.json({ accounts })
  })

  .post('/', zValidator('json', createFinancialAccountSchema), async (c) => {
    const user = c.get('user')
    const input = c.req.valid('json')

    const [created] = await db
      .insert(schema.financialAccount)
      .values({
        userId: user.id,
        name: input.name,
        type: input.type,
        institution: input.institution ?? null,
        last4: input.last4 ?? null,
        balanceCents: signedBalanceForType(input.type, input.balanceCents),
      })
      .returning()

    return c.json({ account: created }, 201)
  })

  .patch('/:id', zValidator('param', idParamSchema), zValidator('json', updateFinancialAccountSchema), async (c) => {
    const user = c.get('user')
    const { id } = c.req.valid('param')
    const patch = c.req.valid('json')

    // One transaction holding the account's row lock — the same lock envelope moves
    // and expenses take first — so nothing can set money aside or spend it while the
    // balance is being checked against what the envelopes hold.
    const result = await db.transaction(async (tx) => {
      const [current] = await tx
        .select({
          type: schema.financialAccount.type,
          balanceCents: schema.financialAccount.balanceCents,
        })
        .from(schema.financialAccount)
        .where(and(eq(schema.financialAccount.id, id), eq(schema.financialAccount.userId, user.id)))
        .for('update')
      if (!current) return { error: 'Cuenta no encontrada', status: 404 as const }

      const envelopes = await tx
        .select({ balanceCents: schema.envelope.balanceCents })
        .from(schema.envelope)
        .where(and(eq(schema.envelope.accountId, id), eq(schema.envelope.userId, user.id)))

      // A credit card's balance is debt, so it can't hold envelopes; turning an
      // account with envelopes into one would leave them stranded.
      if (patch.type === 'credito' && envelopes.length > 0) {
        return { error: 'Esta cuenta tiene cajitas: bórralas antes de cambiarla a crédito.', status: 422 as const }
      }

      const set: typeof patch = { ...patch }
      if (patch.balanceCents !== undefined) {
        if ((patch.type ?? current.type) === 'credito') {
          set.balanceCents = signedBalanceForType('credito', patch.balanceCents)
        }

        // What's set aside in envelopes is money the account holds, so an edit can't
        // leave it with less (an account already short can still be edited towards
        // what its envelopes hold).
        const envelopeBalancesCents = envelopes.map((e) => e.balanceCents)
        if (
          spendsLockedMoney(
            { balanceCents: current.balanceCents, envelopeBalancesCents },
            { balanceCents: set.balanceCents!, envelopeBalancesCents },
          )
        ) {
          return {
            error: `No puedes dejar la cuenta con menos de lo que tienen tus cajitas (${money(allocatedCents(envelopeBalancesCents))}). Libera dinero de una cajita primero.`,
            status: 422 as const,
          }
        }
      }

      const [updated] = await tx
        .update(schema.financialAccount)
        .set({ ...set, updatedAt: new Date() })
        .where(and(eq(schema.financialAccount.id, id), eq(schema.financialAccount.userId, user.id)))
        .returning()
      return { account: updated }
    })

    if ('error' in result) return c.json({ error: result.error }, result.status)
    return c.json({ account: result.account })
  })

  .delete('/:id', zValidator('param', idParamSchema), async (c) => {
    const user = c.get('user')
    const { id } = c.req.valid('param')

    const [deleted] = await db
      .delete(schema.financialAccount)
      .where(
        and(eq(schema.financialAccount.id, id), eq(schema.financialAccount.userId, user.id)),
      )
      .returning()

    if (!deleted) {
      return c.json({ error: 'Cuenta no encontrada' }, 404)
    }

    return c.json({ ok: true })
  })
