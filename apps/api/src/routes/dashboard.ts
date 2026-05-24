import { Hono } from 'hono'
import { and, eq, gte, sum } from 'drizzle-orm'
import { netWorth } from '@finance-tdah/shared/domain'
import { db, schema } from '../db/client'
import { sessionMiddleware, type SessionVariables } from '../middleware/session'

export const dashboardRoute = new Hono<{ Variables: SessionVariables }>()
  .use('*', sessionMiddleware)

  .get('/home', async (c) => {
    const user = c.get('user')

    const accounts = await db.query.financialAccount.findMany({
      where: (a, { eq }) => eq(a.userId, user.id),
    })

    const goals = await db.query.goal.findMany({
      where: (g, { and, eq, isNull }) => and(eq(g.userId, user.id), isNull(g.archivedAt)),
    })

    const startOfWeek = new Date()
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
    startOfWeek.setHours(0, 0, 0, 0)

    const [weekSpentRow] = await db
      .select({ sum: sum(schema.expense.amountCents) })
      .from(schema.expense)
      .where(and(eq(schema.expense.userId, user.id), gte(schema.expense.occurredAt, startOfWeek)))

    const { liquidCents, debtCents, netWorthCents } = netWorth(accounts)
    // Jars are mental accounting over money already counted in `liquidCents`;
    // they are a separate view, never added to net worth. See domain/net-worth.ts.
    const jarsCents = goals.reduce((acc, g) => acc + g.currentCents, 0)

    const weekSpentCents = Number(weekSpentRow?.sum ?? 0)
    const weekTargetCents = 220000 // TODO: presupuesto real

    const todayAvailableCents = Math.max(
      0,
      Math.round((weekTargetCents - weekSpentCents) / 7),
    )

    return c.json({
      summary: {
        todayAvailableCents,
        weekSpentCents,
        weekTargetCents,
        netWorthCents,
        liquidCents,
        jarsCents,
        debtCents,
        greeting: greetByHour(new Date()),
      },
    })
  })

  .get('/breakdown', async (c) => {
    const user = c.get('user')

    const accounts = await db.query.financialAccount.findMany({
      where: (a, { eq }) => eq(a.userId, user.id),
    })
    const goals = await db.query.goal.findMany({
      where: (g, { and, eq, isNull }) => and(eq(g.userId, user.id), isNull(g.archivedAt)),
    })

    const { liquidCents, debtCents, netWorthCents } = netWorth(accounts)
    const jarsCents = goals.reduce((acc, g) => acc + g.currentCents, 0)

    return c.json({
      breakdown: {
        liquidCents,
        jarsCents,
        debtCents,
        netWorthCents,
      },
    })
  })

function greetByHour(d: Date): string {
  const h = d.getHours()
  if (h < 12) return 'Buenos días'
  if (h < 19) return 'Buenas tardes'
  return 'Buenas noches'
}
