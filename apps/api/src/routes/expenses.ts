import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { and, eq, gte, sql, sum } from 'drizzle-orm'
import {
  createExpenseSchema,
  idParamSchema,
  updateExpenseSchema,
  voiceTranscriptSchema,
  type ParsedVoiceExpense,
} from '@finance-tdah/shared/schemas'
import { envelopeDeltaCents, sourceBalanceDeltaCents } from '@finance-tdah/shared/domain'
import { db, schema, type Tx } from '../db/client'
import { sessionMiddleware, type SessionVariables } from '../middleware/session'
import { parseVoiceTranscript } from '../services/voice-parser'
import { sendPushToUser } from '../services/push-sender'
import { logger } from '../lib/logger'

export const expensesRoute = new Hono<{ Variables: SessionVariables }>()
  .use('*', sessionMiddleware)

  .get('/', async (c) => {
    const user = c.get('user')
    const expenses = await db.query.expense.findMany({
      where: (e, { eq }) => eq(e.userId, user.id),
      orderBy: (e, { desc }) => [desc(e.occurredAt)],
      limit: 100,
    })
    return c.json({ expenses })
  })

  .post('/', zValidator('json', createExpenseSchema), async (c) => {
    const user = c.get('user')
    const input = c.req.valid('json')

    try {
      const created = await db.transaction(async (tx) => {
        if (input.kind === 'transfer') {
          const [sourceAccount, targetAccount] = await Promise.all([
            tx.query.financialAccount.findFirst({
              where: (a, { and, eq }) =>
                and(eq(a.id, input.accountId!), eq(a.userId, user.id)),
              columns: { id: true },
            }),
            tx.query.financialAccount.findFirst({
              where: (a, { and, eq }) =>
                and(eq(a.id, input.toAccountId!), eq(a.userId, user.id)),
              columns: { id: true },
            }),
          ])
          if (!sourceAccount || !targetAccount) {
            throw new Error('ACCOUNT_NOT_FOUND')
          }
        } else if (input.accountId) {
          const account = await tx.query.financialAccount.findFirst({
            where: (a, { and, eq }) =>
              and(eq(a.id, input.accountId!), eq(a.userId, user.id)),
            columns: { id: true },
          })
          if (!account) {
            throw new Error('ACCOUNT_NOT_FOUND')
          }
        }

        if (input.envelopeId) {
          await assertEnvelopeOnAccount(tx, input.envelopeId, user.id, input.accountId!)
        }

        const [expense] = await tx
          .insert(schema.expense)
          .values({
            userId: user.id,
            accountId: input.accountId ?? null,
            toAccountId: input.kind === 'transfer' ? (input.toAccountId ?? null) : null,
            envelopeId: input.envelopeId ?? null,
            kind: input.kind,
            amountCents: input.amountCents,
            category: input.category,
            description: input.description,
            occurredAt: input.occurredAt ? new Date(input.occurredAt) : new Date(),
          })
          .returning()

        if (input.accountId) {
          const delta = sourceBalanceDeltaCents(input.kind, input.amountCents)
          await tx
            .update(schema.financialAccount)
            .set({
              balanceCents: sql`${schema.financialAccount.balanceCents} + ${delta}`,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(schema.financialAccount.id, input.accountId),
                eq(schema.financialAccount.userId, user.id),
              ),
            )
        }

        if (input.kind === 'transfer' && input.toAccountId) {
          await tx
            .update(schema.financialAccount)
            .set({
              balanceCents: sql`${schema.financialAccount.balanceCents} + ${input.amountCents}`,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(schema.financialAccount.id, input.toAccountId),
                eq(schema.financialAccount.userId, user.id),
              ),
            )
        }

        // After the account write, which locks its row: same lock order as
        // envelope moves in `envelopes.ts`.
        if (input.envelopeId) {
          await addToEnvelope(tx, input.envelopeId, user.id, envelopeDeltaCents(input.kind, input.amountCents))
        }

        return expense
      })

      if (input.kind === 'expense') {
        await notifyIfBudgetCrossed(user.id, created.amountCents)
      }

      return c.json({ expense: created }, 201)
    } catch (err) {
      const envelopeError = envelopeErrorResponse(err)
      if (envelopeError) return c.json({ error: envelopeError.error }, envelopeError.status)
      if (err instanceof Error && err.message === 'ACCOUNT_NOT_FOUND') {
        return c.json({ error: 'Cuenta no encontrada' }, 404)
      }
      throw err
    }
  })

  .post('/voice', zValidator('json', voiceTranscriptSchema), async (c) => {
    const { transcript } = c.req.valid('json')
    const parsed: ParsedVoiceExpense | null = parseVoiceTranscript(transcript)

    if (!parsed) {
      return c.json({ error: 'No pude entenderte. ¿Lo dices de nuevo?' }, 422)
    }

    return c.json({ parsed })
  })

  .patch(
    '/:id',
    zValidator('param', idParamSchema),
    zValidator('json', updateExpenseSchema),
    async (c) => {
      const user = c.get('user')
      const { id } = c.req.valid('param')
      const patch = c.req.valid('json')

      try {
        const updated = await db.transaction(async (tx) => {
          const current = await tx.query.expense.findFirst({
            where: (e, { and, eq }) => and(eq(e.id, id), eq(e.userId, user.id)),
          })
          if (!current) return null

          const nextKind = patch.kind ?? current.kind
          const nextAmountCents = patch.amountCents ?? current.amountCents
          const nextAccountId = patch.accountId ?? current.accountId
          const nextToAccountId =
            nextKind === 'transfer' ? (patch.toAccountId ?? current.toAccountId) : null

          if (nextKind === 'transfer') {
            if (!nextAccountId || !nextToAccountId || nextAccountId === nextToAccountId) {
              throw new Error('INVALID_TRANSFER')
            }
          }

          // Only verify ownership of accounts that are actually changing —
          // the previous ones were already verified when the expense (or its
          // last update) was created.
          const accountIdsToVerify = new Set<string>()
          if (nextAccountId && nextAccountId !== current.accountId) {
            accountIdsToVerify.add(nextAccountId)
          }
          if (nextToAccountId && nextToAccountId !== current.toAccountId) {
            accountIdsToVerify.add(nextToAccountId)
          }

          // The envelope follows the expense unless the patch says otherwise;
          // it only survives if the expense stays an expense on its account.
          const envelopeInPatch = patch.envelopeId !== undefined
          let nextEnvelopeId = envelopeInPatch ? (patch.envelopeId ?? null) : (current.envelopeId ?? null)
          if (nextKind !== 'expense') {
            if (envelopeInPatch && patch.envelopeId) throw new Error('ENVELOPE_KIND')
            nextEnvelopeId = null
          }
          if (nextEnvelopeId && (nextEnvelopeId !== current.envelopeId || nextAccountId !== current.accountId)) {
            if (envelopeInPatch) {
              await assertEnvelopeOnAccount(tx, nextEnvelopeId, user.id, nextAccountId)
            } else {
              // Moved to another account without naming an envelope: it no
              // longer comes out of the old account's envelope.
              nextEnvelopeId = null
            }
          }

          if (accountIdsToVerify.size > 0) {
            const found = await Promise.all(
              Array.from(accountIdsToVerify).map((accId) =>
                tx.query.financialAccount.findFirst({
                  where: (a, { and, eq }) => and(eq(a.id, accId), eq(a.userId, user.id)),
                  columns: { id: true },
                }),
              ),
            )
            if (found.some((a) => !a)) {
              throw new Error('ACCOUNT_NOT_FOUND')
            }
          }

          // Net balance delta per account: reverse whatever effect the
          // previous version of the row had, then apply the new one — a
          // single combined write per account, not "undo" followed by
          // "redo" as two separate updates that could double-count.
          const deltas = new Map<string, number>()
          const addDelta = (accountId: string | null, amount: number) => {
            if (!accountId) return
            deltas.set(accountId, (deltas.get(accountId) ?? 0) + amount)
          }

          if (current.accountId) {
            addDelta(current.accountId, -sourceBalanceDeltaCents(current.kind, current.amountCents))
          }
          if (current.kind === 'transfer' && current.toAccountId) {
            addDelta(current.toAccountId, -current.amountCents)
          }
          if (nextAccountId) {
            addDelta(nextAccountId, sourceBalanceDeltaCents(nextKind, nextAmountCents))
          }
          if (nextKind === 'transfer' && nextToAccountId) {
            addDelta(nextToAccountId, nextAmountCents)
          }

          for (const [accountId, delta] of deltas) {
            if (delta === 0) continue
            await tx
              .update(schema.financialAccount)
              .set({
                balanceCents: sql`${schema.financialAccount.balanceCents} + ${delta}`,
                updatedAt: new Date(),
              })
              .where(
                and(
                  eq(schema.financialAccount.id, accountId),
                  eq(schema.financialAccount.userId, user.id),
                ),
              )
          }

          const envelopeDeltas = new Map<string, number>()
          if (current.envelopeId) {
            envelopeDeltas.set(current.envelopeId, -envelopeDeltaCents(current.kind, current.amountCents))
          }
          if (nextEnvelopeId) {
            envelopeDeltas.set(
              nextEnvelopeId,
              (envelopeDeltas.get(nextEnvelopeId) ?? 0) + envelopeDeltaCents(nextKind, nextAmountCents),
            )
          }
          for (const [envelopeId, delta] of envelopeDeltas) {
            if (delta !== 0) await addToEnvelope(tx, envelopeId, user.id, delta)
          }

          const [row] = await tx
            .update(schema.expense)
            .set({
              ...(patch.amountCents !== undefined && { amountCents: patch.amountCents }),
              ...(patch.category !== undefined && { category: patch.category }),
              ...(patch.description !== undefined && { description: patch.description }),
              ...(patch.kind !== undefined && { kind: patch.kind }),
              accountId: nextAccountId ?? null,
              toAccountId: nextToAccountId,
              envelopeId: nextEnvelopeId,
              ...(patch.occurredAt !== undefined && { occurredAt: new Date(patch.occurredAt) }),
            })
            .where(and(eq(schema.expense.id, id), eq(schema.expense.userId, user.id)))
            .returning()

          return row
        })

        if (!updated) return c.json({ error: 'Gasto no encontrado' }, 404)
        return c.json({ expense: updated })
      } catch (err) {
        const envelopeError = envelopeErrorResponse(err)
        if (envelopeError) return c.json({ error: envelopeError.error }, envelopeError.status)
        if (err instanceof Error && err.message === 'ACCOUNT_NOT_FOUND') {
          return c.json({ error: 'Cuenta no encontrada' }, 404)
        }
        if (err instanceof Error && err.message === 'INVALID_TRANSFER') {
          return c.json({ error: 'Elige dos cuentas distintas para transferir' }, 422)
        }
        throw err
      }
    },
  )

  .delete('/:id', zValidator('param', idParamSchema), async (c) => {
    const user = c.get('user')
    const { id } = c.req.valid('param')

    const deleted = await db.transaction(async (tx) => {
      const [row] = await tx
        .delete(schema.expense)
        .where(and(eq(schema.expense.id, id), eq(schema.expense.userId, user.id)))
        .returning()

      if (!row) return null

      if (row.accountId) {
        const delta = sourceBalanceDeltaCents(row.kind, row.amountCents)
        await tx
          .update(schema.financialAccount)
          .set({
            balanceCents: sql`${schema.financialAccount.balanceCents} - ${delta}`,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(schema.financialAccount.id, row.accountId),
              eq(schema.financialAccount.userId, user.id),
            ),
          )
      }

      if (row.kind === 'transfer' && row.toAccountId) {
        await tx
          .update(schema.financialAccount)
          .set({
            balanceCents: sql`${schema.financialAccount.balanceCents} - ${row.amountCents}`,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(schema.financialAccount.id, row.toAccountId),
              eq(schema.financialAccount.userId, user.id),
            ),
          )
      }

      if (row.envelopeId) {
        await addToEnvelope(tx, row.envelopeId, user.id, -envelopeDeltaCents(row.kind, row.amountCents))
      }

      return row
    })

    if (!deleted) return c.json({ error: 'Gasto no encontrado' }, 404)

    return c.json({ ok: true })
  })

async function assertEnvelopeOnAccount(
  tx: Tx,
  envelopeId: string,
  userId: string,
  accountId: string | null,
): Promise<void> {
  const found = await tx.query.envelope.findFirst({
    where: (e, { and, eq }) => and(eq(e.id, envelopeId), eq(e.userId, userId)),
    columns: { accountId: true },
  })
  if (!found) throw new Error('ENVELOPE_NOT_FOUND')
  if (found.accountId !== accountId) throw new Error('ENVELOPE_ACCOUNT_MISMATCH')
}

async function addToEnvelope(tx: Tx, envelopeId: string, userId: string, deltaCents: number): Promise<void> {
  await tx
    .update(schema.envelope)
    .set({ balanceCents: sql`${schema.envelope.balanceCents} + ${deltaCents}`, updatedAt: new Date() })
    .where(and(eq(schema.envelope.id, envelopeId), eq(schema.envelope.userId, userId)))
}

function envelopeErrorResponse(err: unknown): { error: string; status: 404 | 422 } | null {
  if (!(err instanceof Error)) return null
  switch (err.message) {
    case 'ENVELOPE_NOT_FOUND':
      return { error: 'Cajita no encontrada', status: 404 }
    case 'ENVELOPE_ACCOUNT_MISMATCH':
      return { error: 'Esa cajita es de otra cuenta', status: 422 }
    case 'ENVELOPE_KIND':
      return { error: 'Solo un gasto puede salir de una cajita', status: 422 }
    default:
      return null
  }
}

// Notify only on the crossing moment (before < target <= after), not on
// every expense once the user is already over budget — otherwise they'd
// get spammed for the rest of the week.
async function notifyIfBudgetCrossed(userId: string, createdAmountCents: number): Promise<void> {
  try {
    const [profile, weekSpentRow] = await Promise.all([
      db.query.userProfile.findFirst({
        where: (p, { eq }) => eq(p.userId, userId),
      }),
      (() => {
        const startOfWeek = new Date()
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
        startOfWeek.setHours(0, 0, 0, 0)

        return db
          .select({ sum: sum(schema.expense.amountCents) })
          .from(schema.expense)
          .where(
            and(
              eq(schema.expense.userId, userId),
              eq(schema.expense.kind, 'expense'),
              gte(schema.expense.occurredAt, startOfWeek),
            ),
          )
          .then(([row]) => row)
      })(),
    ])

    const weekSpentAfter = Number(weekSpentRow?.sum ?? 0)
    const weekSpentBefore = weekSpentAfter - createdAmountCents
    const weekTargetCents = profile?.weeklyBudgetCents ?? 220000

    if (weekSpentBefore < weekTargetCents && weekSpentAfter >= weekTargetCents) {
      await sendPushToUser(userId, {
        title: 'Presupuesto semanal',
        body: 'Llegaste al límite de tu presupuesto de esta semana.',
        url: '/',
      })
    }
  } catch (err) {
    logger.error('budget_notification_failed', {
      userId,
      message: err instanceof Error ? err.message : String(err),
    })
  }
}
