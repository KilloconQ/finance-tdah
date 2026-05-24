import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { requestId } from 'hono/request-id'
import { secureHeaders } from 'hono/secure-headers'
import { auth } from './auth'
import { env } from './env'
import { logger } from './lib/logger'
import { mapErrorToResponse } from './shared/http/error-mapper'
import { DomainError } from './shared/errors/domain-error'
import { accountsRoute } from './routes/accounts'
import { challengesRoute } from './routes/challenges'
import { dashboardRoute } from './routes/dashboard'
import { expensesRoute } from './routes/expenses'
import { goalsRoute } from './routes/goals'
import { profileRoute } from './routes/profile'
import { subscriptionsRoute } from './routes/subscriptions'

const app = new Hono<{ Variables: { requestId: string } }>()

app.use('*', requestId())
app.use('*', async (c, next) => {
  const start = performance.now()
  await next()
  const durationMs = Math.round(performance.now() - start)
  logger.info('request', {
    requestId: c.get('requestId'),
    method: c.req.method,
    path: c.req.path,
    status: c.res.status,
    durationMs,
  })
})
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
  const mapped = mapErrorToResponse(err, c)
  if (mapped) {
    logger.warn('domain_error', {
      requestId: c.get('requestId'),
      code: err instanceof DomainError ? err.code : undefined,
      message: err instanceof Error ? err.message : String(err),
    })
    return mapped
  }
  logger.error('unhandled', {
    requestId: c.get('requestId'),
    method: c.req.method,
    path: c.req.path,
    message: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
  })
  return c.json({ error: 'Internal server error', requestId: c.get('requestId') }, 500)
})

export type AppRouter = typeof api
export type AppType = typeof app

logger.info('startup', { port: env.PORT })
export default {
  port: env.PORT,
  fetch: app.fetch,
  idleTimeout: 30,
}
