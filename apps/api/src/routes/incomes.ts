import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { and, asc, eq } from 'drizzle-orm'
import { createIncomeSchema, idParamSchema, updateIncomeSchema } from '@finance-tdah/shared/schemas'
import { db, schema } from '../db/client'
import { sessionMiddleware, type SessionVariables } from '../middleware/session'

const owned = (id: string, userId: string) =>
  and(eq(schema.scheduledIncome.id, id), eq(schema.scheduledIncome.userId, userId))

export const incomesRoute = new Hono<{ Variables: SessionVariables }>()
  .use('*', sessionMiddleware)

  .get('/', async (c) => {
    const user = c.get('user')
    const incomes = await db.query.scheduledIncome.findMany({
      where: eq(schema.scheduledIncome.userId, user.id),
      orderBy: [asc(schema.scheduledIncome.startsOn)],
    })
    return c.json({ incomes })
  })

  .post('/', zValidator('json', createIncomeSchema), async (c) => {
    const user = c.get('user')
    const input = c.req.valid('json')
    const [income] = await db
      .insert(schema.scheduledIncome)
      .values({
        userId: user.id,
        name: input.name,
        amountCents: input.amountCents ?? null,
        frequency: input.frequency,
        startsOn: input.startsOn,
      })
      .returning()
    return c.json({ income }, 201)
  })

  .patch('/:id', zValidator('param', idParamSchema), zValidator('json', updateIncomeSchema), async (c) => {
    const user = c.get('user')
    const { id } = c.req.valid('param')
    const patch = c.req.valid('json')
    const [income] = await db
      .update(schema.scheduledIncome)
      .set({ ...patch, updatedAt: new Date() })
      .where(owned(id, user.id))
      .returning()
    if (!income) return c.json({ error: 'Ingreso no encontrado' }, 404)
    return c.json({ income })
  })

  .delete('/:id', zValidator('param', idParamSchema), async (c) => {
    const user = c.get('user')
    const { id } = c.req.valid('param')
    const [removed] = await db.delete(schema.scheduledIncome).where(owned(id, user.id)).returning({ id: schema.scheduledIncome.id })
    if (!removed) return c.json({ error: 'Ingreso no encontrado' }, 404)
    return c.json({ ok: true })
  })
