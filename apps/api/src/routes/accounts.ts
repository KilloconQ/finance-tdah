import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { and, eq, gte, or } from 'drizzle-orm'
import {
  createFinancialAccountSchema,
  idParamSchema,
  updateFinancialAccountSchema,
} from '@finance-tdah/shared/schemas'
import {
  allocatedCents,
  cardStatement,
  type CardMovement,
  localClock,
  signedBalanceForType,
  spendsLockedMoney,
} from '@finance-tdah/shared/domain'
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

  // What a credit card asks for on its next payment date (see domain/card-statement.ts).
  .get('/:id/statement', zValidator('param', idParamSchema), async (c) => {
    const user = c.get('user')
    const { id } = c.req.valid('param')

    const account = await db.query.financialAccount.findFirst({
      where: (a, { and, eq }) => and(eq(a.id, id), eq(a.userId, user.id)),
    })
    if (!account) return c.json({ error: 'Cuenta no encontrada' }, 404)
    if (account.type !== 'credito' || account.cutoffDay === null || account.paymentDay === null) {
      return c.json({ error: 'Esta tarjeta no tiene fecha de corte y de pago.' }, 422)
    }

    const profile = await db.query.userProfile.findFirst({ where: (p, { eq }) => eq(p.userId, user.id) })
    const timeZone = profile?.timeZone ?? 'America/Mexico_City'

    // Two statement periods back is the furthest the calculation looks.
    const since = new Date(Date.now() - 75 * 24 * 60 * 60 * 1000)
    const rows = await db
      .select({
        kind: schema.expense.kind,
        accountId: schema.expense.accountId,
        amountCents: schema.expense.amountCents,
        occurredAt: schema.expense.occurredAt,
      })
      .from(schema.expense)
      .where(
        and(
          eq(schema.expense.userId, user.id),
          gte(schema.expense.occurredAt, since),
          or(eq(schema.expense.accountId, id), eq(schema.expense.toAccountId, id)),
        ),
      )

    // Money leaving the card (expenses, transfers out) is a purchase; money arriving
    // (income, transfers in) is a payment.
    const purchases: CardMovement[] = []
    const payments: CardMovement[] = []
    for (const r of rows) {
      const movement = { date: localClock(r.occurredAt, timeZone).date, cents: r.amountCents }
      const leaves = r.accountId === id && r.kind !== 'income'
      ;(leaves ? purchases : payments).push(movement)
    }

    const statement = cardStatement({
      cutoffDay: account.cutoffDay,
      paymentDay: account.paymentDay,
      today: localClock(new Date(), timeZone).date,
      purchases,
      payments,
    })
    return c.json({ statement })
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
        cutoffDay: input.type === 'credito' ? (input.cutoffDay ?? null) : null,
        paymentDay: input.type === 'credito' ? (input.paymentDay ?? null) : null,
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
          cutoffDay: schema.financialAccount.cutoffDay,
          paymentDay: schema.financialAccount.paymentDay,
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
      // Statement days only make sense on a credit card, and only as a pair.
      if ((patch.type ?? current.type) !== 'credito') {
        if (patch.type || patch.cutoffDay !== undefined || patch.paymentDay !== undefined) {
          set.cutoffDay = null
          set.paymentDay = null
        }
      } else {
        const cutoff = patch.cutoffDay === undefined ? current.cutoffDay : patch.cutoffDay
        const payment = patch.paymentDay === undefined ? current.paymentDay : patch.paymentDay
        if ((cutoff === null) !== (payment === null)) {
          return { error: 'Pon el día de corte y el de pago, o deja los dos vacíos.', status: 422 as const }
        }
      }
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
