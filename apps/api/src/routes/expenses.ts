import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { and, eq, gte, sql, sum } from 'drizzle-orm'
import {
  createExpenseSchema,
  idParamSchema,
  voiceTranscriptSchema,
  type ParsedVoiceExpense,
} from '@finance-tdah/shared/schemas'
import { sourceBalanceDeltaCents } from '@finance-tdah/shared/domain'
import { db, schema } from '../db/client'
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

        const [expense] = await tx
          .insert(schema.expense)
          .values({
            userId: user.id,
            accountId: input.accountId ?? null,
            toAccountId: input.kind === 'transfer' ? (input.toAccountId ?? null) : null,
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

        return expense
      })

      if (input.kind === 'expense') {
        await notifyIfBudgetCrossed(user.id, created.amountCents)
      }

      return c.json({ expense: created }, 201)
    } catch (err) {
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
      return c.json({ error: 'No pude entenderte. ¿Lo decís de nuevo?' }, 422)
    }

    return c.json({ parsed })
  })

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

      return row
    })

    if (!deleted) return c.json({ error: 'Gasto no encontrado' }, 404)

    return c.json({ ok: true })
  })

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
