import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { and, eq, isNull } from 'drizzle-orm'
import {
  createSubscriptionSchema,
  idParamSchema,
  updateSubscriptionSchema,
} from '@finance-tdah/shared/schemas'
import { db, schema } from '../db/client'
import { sessionMiddleware, type SessionVariables } from '../middleware/session'

export const subscriptionsRoute = new Hono<{ Variables: SessionVariables }>()
  .use('*', sessionMiddleware)

  .get('/', async (c) => {
    const user = c.get('user')
    const subs = await db.query.subscription.findMany({
      where: (s, { and, eq, isNull }) => and(eq(s.userId, user.id), isNull(s.cancelledAt)),
      orderBy: (s, { asc }) => [asc(s.nextChargeAt)],
    })
    return c.json({ subscriptions: subs })
  })

  .post('/', zValidator('json', createSubscriptionSchema), async (c) => {
    const user = c.get('user')
    const input = c.req.valid('json')

    const [created] = await db
      .insert(schema.subscription)
      .values({
        userId: user.id,
        name: input.name,
        category: input.category,
        amountCents: input.amountCents,
        cadence: input.cadence,
        nextChargeAt: input.nextChargeAt,
        lastOpenedAt: input.lastOpenedAt ?? null,
      })
      .returning()

    return c.json({ subscription: created }, 201)
  })

  .patch('/:id', zValidator('param', idParamSchema), zValidator('json', updateSubscriptionSchema), async (c) => {
    const user = c.get('user')
    const { id } = c.req.valid('param')
    const patch = c.req.valid('json')

    const [updated] = await db
      .update(schema.subscription)
      .set({ ...patch, updatedAt: new Date() })
      .where(
        and(
          eq(schema.subscription.id, id),
          eq(schema.subscription.userId, user.id),
          isNull(schema.subscription.cancelledAt),
        ),
      )
      .returning()

    if (!updated) return c.json({ error: 'Suscripción no encontrada' }, 404)
    return c.json({ subscription: updated })
  })

  .post('/:id/cancel', zValidator('param', idParamSchema), async (c) => {
    const user = c.get('user')
    const { id } = c.req.valid('param')

    const [cancelled] = await db
      .update(schema.subscription)
      .set({ cancelledAt: new Date(), updatedAt: new Date() })
      .where(and(eq(schema.subscription.id, id), eq(schema.subscription.userId, user.id)))
      .returning()

    if (!cancelled) return c.json({ error: 'Suscripción no encontrada' }, 404)
    return c.json({ subscription: cancelled })
  })
