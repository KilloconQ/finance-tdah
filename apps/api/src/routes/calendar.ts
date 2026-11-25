import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { and, eq, isNull } from 'drizzle-orm'
import { calendarEvents, DEFAULT_TIME_ZONE, localClock } from '@finance-tdah/shared/domain'
import { calendarQuerySchema } from '@finance-tdah/shared/schemas'
import { db, schema } from '../db/client'
import { sessionMiddleware, type SessionVariables } from '../middleware/session'

/** What has to be paid and what comes in over a date range. The server computes it so every client shows the same days. */
export const calendarRoute = new Hono<{ Variables: SessionVariables }>()
  .use('*', sessionMiddleware)

  .get('/', zValidator('query', calendarQuerySchema), async (c) => {
    const user = c.get('user')
    const { from, to } = c.req.valid('query')

    const [accounts, subscriptions, incomes, profile] = await Promise.all([
      db.query.financialAccount.findMany({
        where: and(eq(schema.financialAccount.userId, user.id), eq(schema.financialAccount.type, 'credito'), isNull(schema.financialAccount.closedAt)),
      }),
      db.query.subscription.findMany({
        where: and(eq(schema.subscription.userId, user.id), isNull(schema.subscription.cancelledAt)),
      }),
      db.query.scheduledIncome.findMany({ where: eq(schema.scheduledIncome.userId, user.id) }),
      db.query.userProfile.findFirst({ where: eq(schema.userProfile.userId, user.id) }),
    ])

    const events = calendarEvents({
      from,
      to,
      cards: accounts.map((a) => ({ id: a.id, name: a.name, cutoffDay: a.cutoffDay, paymentDay: a.paymentDay })),
      subscriptions: subscriptions.map((s) => ({
        id: s.id,
        name: s.name,
        amountCents: s.amountCents,
        cadence: s.cadence,
        nextChargeAt: s.nextChargeAt,
      })),
      incomes: incomes.map((i) => ({
        id: i.id,
        name: i.name,
        amountCents: i.amountCents,
        frequency: i.frequency,
        startsOn: i.startsOn,
      })),
    })

    return c.json({ today: localClock(new Date(), profile?.timeZone ?? DEFAULT_TIME_ZONE).date, events })
  })
