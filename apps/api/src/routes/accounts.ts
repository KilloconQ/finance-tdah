import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { and, eq } from 'drizzle-orm'
import {
  createFinancialAccountSchema,
  idParamSchema,
  updateFinancialAccountSchema,
} from '@finance-tdah/shared/schemas'
import { db, schema } from '../db/client'
import { sessionMiddleware, type SessionVariables } from '../middleware/session'

export const accountsRoute = new Hono<{ Variables: SessionVariables }>()
  .use('*', sessionMiddleware)

  .get('/', async (c) => {
    const user = c.get('user')
    const accounts = await db.query.financialAccount.findMany({
      where: (a, { eq }) => eq(a.userId, user.id),
      orderBy: (a, { asc }) => [asc(a.createdAt)],
    })
    return c.json({ accounts })
  })

  .post('/', zValidator('json', createFinancialAccountSchema), async (c) => {
    const user = c.get('user')
    const input = c.req.valid('json')

    const [created] = await db
      .insert(schema.financialAccount)
      .values({
        userId: user.id,
        name: input.name,
        type: input.type,
        institution: input.institution ?? null,
        last4: input.last4 ?? null,
        balanceCents: input.balanceCents,
      })
      .returning()

    return c.json({ account: created }, 201)
  })

  .patch('/:id', zValidator('param', idParamSchema), zValidator('json', updateFinancialAccountSchema), async (c) => {
    const user = c.get('user')
    const { id } = c.req.valid('param')
    const patch = c.req.valid('json')

    const [updated] = await db
      .update(schema.financialAccount)
      .set({ ...patch, updatedAt: new Date() })
      .where(
        and(eq(schema.financialAccount.id, id), eq(schema.financialAccount.userId, user.id)),
      )
      .returning()

    if (!updated) {
      return c.json({ error: 'Cuenta no encontrada' }, 404)
    }

    return c.json({ account: updated })
  })

  .delete('/:id', zValidator('param', idParamSchema), async (c) => {
    const user = c.get('user')
    const { id } = c.req.valid('param')

    const [deleted] = await db
      .delete(schema.financialAccount)
      .where(
        and(eq(schema.financialAccount.id, id), eq(schema.financialAccount.userId, user.id)),
      )
      .returning()

    if (!deleted) {
      return c.json({ error: 'Cuenta no encontrada' }, 404)
    }

    return c.json({ ok: true })
  })
