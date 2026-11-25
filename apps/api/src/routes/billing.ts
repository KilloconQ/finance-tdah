import { createHash, timingSafeEqual } from 'node:crypto'
import { Hono } from 'hono'
import { z } from 'zod'
import { eq, lt } from 'drizzle-orm'
import { db, schema } from '../db/client'
import { env, features } from '../env'
import { logger } from '../lib/logger'
import { accessFor } from '../lib/access'
import { sessionMiddleware, type SessionVariables } from '../middleware/session'

const sha = (s: string) => createHash('sha256').update(s).digest()

const webhookSchema = z.object({
  event: z.object({
    type: z.string(),
    app_user_id: z.string(),
    entitlement_ids: z.array(z.string()).nullish(),
    expiration_at_ms: z.number().nullish(),
    event_timestamp_ms: z.number(),
    product_id: z.string().nullish(),
    store: z.string().nullish(),
  }),
})

export const billingRoute = new Hono<{ Variables: SessionVariables }>()
  // RevenueCat calls this with the shared secret in `Authorization`; no session.
  .post('/webhook', async (c) => {
    const secret = env.REVENUECAT_WEBHOOK_AUTH
    if (!secret || !timingSafeEqual(sha(c.req.header('authorization') ?? ''), sha(secret))) {
      return c.json({ error: 'No autorizado' }, 401)
    }
    const parsed = webhookSchema.safeParse(await c.req.json().catch(() => null))
    if (!parsed.success) return c.json({ error: 'Evento inválido' }, 400)
    const e = parsed.data.event

    // ponytail: TRANSFER (moving a purchase between app users) is ignored; the purchase is tied to the user id we configure the SDK with.
    const relevant = e.entitlement_ids?.includes(env.REVENUECAT_ENTITLEMENT_ID)
    if (!relevant || e.type === 'TEST' || e.type === 'TRANSFER') return c.json({ ok: true })

    const expiresAt = e.expiration_at_ms ? new Date(e.expiration_at_ms) : null
    const active = e.type !== 'EXPIRATION' && expiresAt !== null && expiresAt > new Date()
    const at = new Date(e.event_timestamp_ms)
    const row = { active, productId: e.product_id ?? null, store: e.store ?? null, expiresAt, lastEventAt: at, updatedAt: new Date() }

    const user = await db.query.user.findFirst({ columns: { id: true }, where: eq(schema.user.id, e.app_user_id) })
    if (!user) return c.json({ ok: true }) // anonymous RevenueCat id: nobody to unlock
    await db
      .insert(schema.billingEntitlement)
      .values({ userId: user.id, ...row })
      .onConflictDoUpdate({
        target: schema.billingEntitlement.userId,
        set: row,
        // A retry or an out-of-order event must not undo a newer one.
        setWhere: lt(schema.billingEntitlement.lastEventAt, at),
      })
    logger.info('billing_event', { type: e.type, active })
    return c.json({ ok: true })
  })

  .get('/status', sessionMiddleware, async (c) => {
    const access = await accessFor(c.get('user'))
    return c.json({ required: features.billing, hasAccess: access !== 'none', access })
  })
