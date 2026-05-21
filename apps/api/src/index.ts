import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { secureHeaders } from 'hono/secure-headers'
import { auth } from './auth'
import { env } from './env'
import { accountsRoute } from './routes/accounts'
import { challengesRoute } from './routes/challenges'
import { dashboardRoute } from './routes/dashboard'
import { expensesRoute } from './routes/expenses'
import { goalsRoute } from './routes/goals'
import { profileRoute } from './routes/profile'
import { subscriptionsRoute } from './routes/subscriptions'

const app = new Hono()

app.use('*', logger())
app.use('*', secureHeaders())
app.use(
  '*',
  cors({
    origin: env.WEB_ORIGIN,
    credentials: true,
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  }),
)

app.get('/health', (c) => c.json({ status: 'ok', env: env.NODE_ENV }))

app.on(['POST', 'GET'], '/api/auth/*', (c) => auth.handler(c.req.raw))

const api = app
  .basePath('/api')
  .route('/profile', profileRoute)
  .route('/accounts', accountsRoute)
  .route('/goals', goalsRoute)
  .route('/expenses', expensesRoute)
  .route('/subscriptions', subscriptionsRoute)
  .route('/challenges', challengesRoute)
  .route('/dashboard', dashboardRoute)

app.notFound((c) => c.json({ error: 'Not found' }, 404))
app.onError((err, c) => {
  console.error('🔥 API error:', err)
  return c.json({ error: 'Internal server error' }, 500)
})

export type AppRouter = typeof api
export type AppType = typeof app

console.log(`🚀 API listening on http://0.0.0.0:${env.PORT}`)
export default {
  port: env.PORT,
  fetch: app.fetch,
  idleTimeout: 30,
}
