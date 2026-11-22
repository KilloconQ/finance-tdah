import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { resolveAlertRules } from '@finance-tdah/shared/domain'
import { alertKindSchema, notificationRuleInputSchema } from '@finance-tdah/shared/schemas'
import { db, schema } from '../db/client'
import { sessionMiddleware, type SessionVariables } from '../middleware/session'

/** How and when each kind of calendar notification is sent. A kind the user never touched reports its defaults. */
export const notificationRulesRoute = new Hono<{ Variables: SessionVariables }>()
  .use('*', sessionMiddleware)

  .get('/', async (c) => {
    const user = c.get('user')
    const stored = await db.select().from(schema.notificationRule).where(eq(schema.notificationRule.userId, user.id))
    return c.json({ rules: resolveAlertRules(stored) })
  })

  .put('/:kind', zValidator('param', z.object({ kind: alertKindSchema })), zValidator('json', notificationRuleInputSchema), async (c) => {
    const user = c.get('user')
    const { kind } = c.req.valid('param')
    const input = c.req.valid('json')
    await db
      .insert(schema.notificationRule)
      .values({ userId: user.id, kind, ...input })
      .onConflictDoUpdate({ target: [schema.notificationRule.userId, schema.notificationRule.kind], set: input })
    return c.json({ rule: { kind, ...input } })
  })
