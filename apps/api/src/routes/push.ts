import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { and, eq } from 'drizzle-orm'
import {
  pushSubscribeSchema,
  pushUnsubscribeSchema,
  registerDeviceSchema,
  unregisterDeviceSchema,
} from '@finance-tdah/shared/schemas'
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

  // Native (iPhone) notifications. The token identifies a phone, not a person: whoever signed in last on it owns it.
  .post('/device', async (c, next) => {
    if (!features.apns) {
      return c.json({ error: 'Las notificaciones del iPhone no están configuradas en el servidor.' }, 503)
    }
    return next()
  })

  .post('/device', zValidator('json', registerDeviceSchema), async (c) => {
    const user = c.get('user')
    const input = c.req.valid('json')
    // APNs tokens are hex and case-insensitive: one canonical spelling keeps a device from landing twice.
    const token = input.token.toLowerCase()

    const [device] = await db
      .insert(schema.deviceToken)
      .values({ userId: user.id, token, environment: input.environment })
      .onConflictDoUpdate({
        target: schema.deviceToken.token,
        set: { userId: user.id, environment: input.environment },
      })
      .returning({ id: schema.deviceToken.id, environment: schema.deviceToken.environment })

    return c.json({ device }, 201)
  })

  .delete('/device', zValidator('json', unregisterDeviceSchema), async (c) => {
    const user = c.get('user')
    const token = c.req.valid('json').token.toLowerCase()

    const [deleted] = await db
      .delete(schema.deviceToken)
      .where(and(eq(schema.deviceToken.token, token), eq(schema.deviceToken.userId, user.id)))
      .returning()

    if (!deleted) return c.json({ error: 'Dispositivo no encontrado' }, 404)
    return c.json({ ok: true })
  })
