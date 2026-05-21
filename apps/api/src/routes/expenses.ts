import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { and, eq, sql } from 'drizzle-orm'
import {
  createExpenseSchema,
  idParamSchema,
  voiceTranscriptSchema,
  type ParsedVoiceExpense,
} from '@finance-tdah/shared/schemas'
import { db, schema } from '../db/client'
import { sessionMiddleware, type SessionVariables } from '../middleware/session'
import { parseVoiceTranscript } from '../services/voice-parser'

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

    const [created] = await db
      .insert(schema.expense)
      .values({
        userId: user.id,
        accountId: input.accountId ?? null,
        amountCents: input.amountCents,
        category: input.category,
        description: input.description,
        occurredAt: input.occurredAt ? new Date(input.occurredAt) : new Date(),
      })
      .returning()

    if (input.accountId) {
      await db
        .update(schema.financialAccount)
        .set({
          balanceCents: sql`${schema.financialAccount.balanceCents} - ${input.amountCents}`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(schema.financialAccount.id, input.accountId),
            eq(schema.financialAccount.userId, user.id),
          ),
        )
    }

    return c.json({ expense: created }, 201)
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

    const [deleted] = await db
      .delete(schema.expense)
      .where(and(eq(schema.expense.id, id), eq(schema.expense.userId, user.id)))
      .returning()

    if (!deleted) return c.json({ error: 'Gasto no encontrado' }, 404)

    if (deleted.accountId) {
      await db
        .update(schema.financialAccount)
        .set({
          balanceCents: sql`${schema.financialAccount.balanceCents} + ${deleted.amountCents}`,
          updatedAt: new Date(),
        })
        .where(eq(schema.financialAccount.id, deleted.accountId))
    }

    return c.json({ ok: true })
  })
