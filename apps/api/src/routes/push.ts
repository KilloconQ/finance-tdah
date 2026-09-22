import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { and, eq } from 'drizzle-orm'
import { pushSubscribeSchema, pushUnsubscribeSchema } from '@finance-tdah/shared/schemas'
import { db, schema } from '../db/client'
import { features } from '../env'
import { sessionMiddleware, type SessionVariables } from '../middleware/session'

export const pushRoute = new Hono<{ Variables: SessionVariables }>()
  .use('*', sessionMiddleware)

  // Catches a partial config the web build cannot see: VAPID_PUBLIC_KEY is baked
  // into the bundle, so with only the private key missing the toggle would render
  // and subscribe cleanly while no notification could ever be sent.
  .post('/subscribe', async (c, next) => {
    if (!features.webPush) {
      return c.json({ error: 'Las notificaciones no están configuradas en el servidor.' }, 503)
    }
    return next()
  })

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
