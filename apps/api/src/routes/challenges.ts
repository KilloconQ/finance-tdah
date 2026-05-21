import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { and, desc, eq, isNull, sql } from 'drizzle-orm'
import {
  createChallengeSchema,
  idParamSchema,
} from '@finance-tdah/shared/schemas'
import { db, schema } from '../db/client'
import { sessionMiddleware, type SessionVariables } from '../middleware/session'

export const challengesRoute = new Hono<{ Variables: SessionVariables }>()
  .use('*', sessionMiddleware)

  .get('/active', async (c) => {
    const user = c.get('user')
    const [active] = await db
      .select()
      .from(schema.challenge)
      .where(
        and(
          eq(schema.challenge.userId, user.id),
          isNull(schema.challenge.completedAt),
          isNull(schema.challenge.failedAt),
        ),
      )
      .orderBy(desc(schema.challenge.startedAt))
      .limit(1)

    return c.json({ challenge: active ?? null })
  })

  .get('/', async (c) => {
    const user = c.get('user')
    const challenges = await db.query.challenge.findMany({
      where: (ch, { eq }) => eq(ch.userId, user.id),
      orderBy: (ch, { desc }) => [desc(ch.startedAt)],
      limit: 20,
    })
    return c.json({ challenges })
  })

  .post('/', zValidator('json', createChallengeSchema), async (c) => {
    const user = c.get('user')
    const input = c.req.valid('json')

    const [created] = await db
      .insert(schema.challenge)
      .values({
        userId: user.id,
        name: input.name,
        description: input.description,
        days: input.days,
        expectedSavingsCents: input.expectedSavingsCents,
      })
      .returning()

    return c.json({ challenge: created }, 201)
  })

  .post('/:id/check', zValidator('param', idParamSchema), async (c) => {
    const user = c.get('user')
    const { id } = c.req.valid('param')

    const [updated] = await db
      .update(schema.challenge)
      .set({
        doneDays: sql`LEAST(${schema.challenge.doneDays} + 1, ${schema.challenge.days})`,
      })
      .where(and(eq(schema.challenge.id, id), eq(schema.challenge.userId, user.id)))
      .returning()

    if (!updated) return c.json({ error: 'Reto no encontrado' }, 404)

    if (updated.doneDays >= updated.days) {
      const [completed] = await db
        .update(schema.challenge)
        .set({ completedAt: new Date() })
        .where(eq(schema.challenge.id, id))
        .returning()
      return c.json({ challenge: completed })
    }

    return c.json({ challenge: updated })
  })

  .post('/:id/fail', zValidator('param', idParamSchema), async (c) => {
    const user = c.get('user')
    const { id } = c.req.valid('param')

    const [updated] = await db
      .update(schema.challenge)
      .set({ failedAt: new Date() })
      .where(and(eq(schema.challenge.id, id), eq(schema.challenge.userId, user.id)))
      .returning()

    if (!updated) return c.json({ error: 'Reto no encontrado' }, 404)
    return c.json({ challenge: updated })
  })
