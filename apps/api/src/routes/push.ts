import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { and, eq } from 'drizzle-orm'
import { pushSubscribeSchema, pushUnsubscribeSchema } from '@finance-tdah/shared/schemas'
import { db, schema } from '../db/client'
import { sessionMiddleware, type SessionVariables } from '../middleware/session'

export const pushRoute = new Hono<{ Variables: SessionVariables }>()
  .use('*', sessionMiddleware)

  .post('/subscribe', zValidator('json', pushSubscribeSchema), async (c) => {
    const user = c.get('user')
    const input = c.req.valid('json')

    const [subscription] = await db
      .insert(schema.pushSubscription)
      .values({
        userId: user.id,
        endpoint: input.endpoint,
        p256dh: input.keys.p256dh,
        auth: input.keys.auth,
      })
      .onConflictDoUpdate({
        target: schema.pushSubscription.endpoint,
        set: {
          userId: user.id,
          p256dh: input.keys.p256dh,
          auth: input.keys.auth,
        },
      })
      .returning()

    return c.json({ subscription }, 201)
  })

  .delete('/subscribe', zValidator('json', pushUnsubscribeSchema), async (c) => {
    const user = c.get('user')
    const { endpoint } = c.req.valid('json')

    const [deleted] = await db
      .delete(schema.pushSubscription)
      .where(and(eq(schema.pushSubscription.endpoint, endpoint), eq(schema.pushSubscription.userId, user.id)))
      .returning()

    if (!deleted) return c.json({ error: 'Suscripción no encontrada' }, 404)
    return c.json({ ok: true })
  })
