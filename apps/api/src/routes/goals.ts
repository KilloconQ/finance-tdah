import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { and, eq, isNull, sql } from 'drizzle-orm'
import {
  addToGoalSchema,
  createGoalSchema,
  idParamSchema,
  updateGoalSchema,
} from '@finance-tdah/shared/schemas'
import { db, schema } from '../db/client'
import { sessionMiddleware, type SessionVariables } from '../middleware/session'

export const goalsRoute = new Hono<{ Variables: SessionVariables }>()
  .use('*', sessionMiddleware)

  .get('/', async (c) => {
    const user = c.get('user')
    const goals = await db.query.goal.findMany({
      where: (g, { and, eq, isNull }) => and(eq(g.userId, user.id), isNull(g.archivedAt)),
      orderBy: (g, { asc }) => [asc(g.createdAt)],
    })
    return c.json({ goals })
  })

  .post('/', zValidator('json', createGoalSchema), async (c) => {
    const user = c.get('user')
    const input = c.req.valid('json')

    const [created] = await db
      .insert(schema.goal)
      .values({
        userId: user.id,
        name: input.name,
        emoji: input.emoji,
        targetCents: input.targetCents,
        deadline: input.deadline ?? null,
      })
      .returning()

    return c.json({ goal: created }, 201)
  })

  .get('/:id', zValidator('param', idParamSchema), async (c) => {
    const user = c.get('user')
    const { id } = c.req.valid('param')

    const goal = await db.query.goal.findFirst({
      where: (g, { and, eq }) => and(eq(g.id, id), eq(g.userId, user.id)),
    })

    if (!goal) return c.json({ error: 'Frasco no encontrado' }, 404)
    return c.json({ goal })
  })

  .patch('/:id', zValidator('param', idParamSchema), zValidator('json', updateGoalSchema), async (c) => {
    const user = c.get('user')
    const { id } = c.req.valid('param')
    const patch = c.req.valid('json')

    const [updated] = await db
      .update(schema.goal)
      .set({ ...patch, updatedAt: new Date() })
      .where(and(eq(schema.goal.id, id), eq(schema.goal.userId, user.id), isNull(schema.goal.archivedAt)))
      .returning()

    if (!updated) return c.json({ error: 'Frasco no encontrado' }, 404)
    return c.json({ goal: updated })
  })

  .post('/:id/add', zValidator('param', idParamSchema), zValidator('json', addToGoalSchema), async (c) => {
    const user = c.get('user')
    const { id } = c.req.valid('param')
    const { amountCents } = c.req.valid('json')

    const [updated] = await db
      .update(schema.goal)
      .set({
        // Store the real deposited amount. Overflow past the target is a UI
        // concern (see domain/jar.ts `jarProgress.overflowCents`), not the DB's
        // call — capping here would silently swallow the user's money.
        currentCents: sql`${schema.goal.currentCents} + ${amountCents}`,
        updatedAt: new Date(),
      })
      .where(
        and(eq(schema.goal.id, id), eq(schema.goal.userId, user.id), isNull(schema.goal.archivedAt)),
      )
      .returning()

    if (!updated) return c.json({ error: 'Frasco no encontrado' }, 404)
    return c.json({ goal: updated })
  })

  .delete('/:id', zValidator('param', idParamSchema), async (c) => {
    const user = c.get('user')
    const { id } = c.req.valid('param')

    const [archived] = await db
      .update(schema.goal)
      .set({ archivedAt: new Date(), updatedAt: new Date() })
      .where(
        and(eq(schema.goal.id, id), eq(schema.goal.userId, user.id), isNull(schema.goal.archivedAt)),
      )
      .returning()

    if (!archived) return c.json({ error: 'Frasco no encontrado' }, 404)
    return c.json({ ok: true })
  })
