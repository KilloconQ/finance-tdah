import { Hono } from 'hono'
import { count, countDistinct, gt, inArray, sql } from 'drizzle-orm'
import { db, schema } from '../db/client'
import { env } from '../env'
import { sessionMiddleware, type SessionVariables } from '../middleware/session'

const weekAgo = () => new Date(Date.now() - 7 * 86_400_000)

export const adminRoute = new Hono<{ Variables: SessionVariables }>()
  .use('*', sessionMiddleware)
  // Anyone else gets the same 404 as a path that doesn't exist.
  .use('*', async (c, next) => {
    if (!env.ADMIN_EMAILS.includes(c.get('user').email.toLowerCase())) return c.json({ error: 'Not found' }, 404)
    return next()
  })

  .get('/stats', async (c) => {
    const n = async (q: Promise<{ n: number }[]>) => (await q)[0]?.n ?? 0
    const onboarded = (platform: 'web' | 'ios') =>
      n(db.select({ n: count() }).from(schema.userOnboarding).where(sql`${schema.userOnboarding.platform} = ${platform}`))

    const [users, allowlisted, subscribers, active, expenses, web, ios, signups] = await Promise.all([
      n(db.select({ n: count() }).from(schema.user)),
      env.ALLOWED_EMAILS.length
        ? n(db.select({ n: count() }).from(schema.user).where(inArray(sql`lower(${schema.user.email})`, env.ALLOWED_EMAILS)))
        : 0,
      n(
        db
          .select({ n: count() })
          .from(schema.billingEntitlement)
          .where(sql`${schema.billingEntitlement.active} and (${schema.billingEntitlement.expiresAt} is null or ${schema.billingEntitlement.expiresAt} > now())`),
      ),
      n(db.select({ n: countDistinct(schema.session.userId) }).from(schema.session).where(gt(schema.session.updatedAt, weekAgo()))),
      n(db.select({ n: count() }).from(schema.expense).where(gt(schema.expense.createdAt, weekAgo()))),
      onboarded('web'),
      onboarded('ios'),
      db.execute<{ day: string; count: number }>(sql`
        select to_char(created_at::date, 'YYYY-MM-DD') as day, count(*)::int as count
        from ${schema.user} where created_at > now() - interval '30 days' group by 1 order by 1`),
    ])
    return c.json({
      users,
      allowlisted,
      subscribers,
      activeLast7Days: active,
      expensesLast7Days: expenses,
      onboarded: { web, ios },
      signupsByDay: signups.rows ?? signups,
    })
  })
