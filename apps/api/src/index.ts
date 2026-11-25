import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { requestId } from 'hono/request-id'
import { secureHeaders } from 'hono/secure-headers'
import { auth } from './auth'
import { env, features } from './env'
import { logger } from './lib/logger'
import { redactPath } from './lib/redact-path'
import { mapErrorToResponse } from './shared/http/error-mapper'
import { DomainError } from './shared/errors/domain-error'
import { accountsRoute } from './routes/accounts'
import { challengesRoute } from './routes/challenges'
import { dashboardRoute } from './routes/dashboard'
import { envelopesRoute } from './routes/envelopes'
import { expensesRoute } from './routes/expenses'
import { goalsRoute } from './routes/goals'
import { groupsRoute } from './routes/groups'
import { invitationsRoute } from './routes/invitations'
import { profileRoute } from './routes/profile'
import { pushRoute } from './routes/push'
import { subscriptionsRoute } from './routes/subscriptions'
import { accessGate } from './middleware/access'
import { adminRoute } from './routes/admin'
import { billingRoute } from './routes/billing'
import { calendarRoute } from './routes/calendar'
import { incomesRoute } from './routes/incomes'
import { notificationRulesRoute } from './routes/notification-rules'
import { startDailyReminders } from './services/daily-reminder'

const app = new Hono<{ Variables: { requestId: string } }>()

app.use('*', requestId())
app.use('*', async (c, next) => {
  const start = performance.now()
  await next()
  const durationMs = Math.round(performance.now() - start)
  logger.info('request', {
    requestId: c.get('requestId'),
    method: c.req.method,
    path: redactPath(c.req.path),
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
    allowHeaders: ['Content-Type', 'Authorization', 'X-Client-Platform'],
  }),
)

app.get('/health', (c) => c.json({ status: 'ok' }))

app.on(['POST', 'GET'], '/api/auth/*', (c) => auth.handler(c.req.raw))

app.use('/api/*', accessGate)

const api = app
  .basePath('/api')
  .route('/profile', profileRoute)
  .route('/billing', billingRoute)
  .route('/admin', adminRoute)
  .route('/calendar', calendarRoute)
  .route('/incomes', incomesRoute)
  .route('/notification-rules', notificationRulesRoute)
  .route('/accounts', accountsRoute)
  .route('/envelopes', envelopesRoute)
  .route('/goals', goalsRoute)
  .route('/groups', groupsRoute)
  .route('/invitations', invitationsRoute)
  .route('/expenses', expensesRoute)
  .route('/push', pushRoute)
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
    path: redactPath(c.req.path),
    message: err instanceof Error ? err.message : String(err),
    stack: env.NODE_ENV === 'production' ? undefined : err instanceof Error ? err.stack : undefined,
  })
  return c.json({ error: 'Internal server error', requestId: c.get('requestId') }, 500)
})

export type AppRouter = typeof api
export type AppType = typeof app

logger.info('startup', { port: env.PORT })
if (env.NODE_ENV === 'production' && !features.billing) {
  logger.warn('feature_disabled', {
    feature: 'billing',
    message: 'REVENUECAT_WEBHOOK_AUTH is not set — nobody is asked to pay.',
  })
}
if (!features.passwordResetEmail) {
  logger.warn('feature_disabled', {
    feature: 'password_reset_email',
    message: 'RESEND_API_KEY is not set — password reset and invitation emails will not be sent. Sign-in is unaffected.',
  })
}
if (!features.webPush) {
  logger.warn('feature_disabled', {
    feature: 'web_push',
    message: `${features.webPushProblem} Push notifications are disabled; sign-in is unaffected.`,
  })
}
if (features.apnsConfigured && !features.apns) {
  logger.warn('feature_disabled', {
    feature: 'apns',
    message: `${features.apnsProblem} iPhone notifications are disabled; sign-in is unaffected.`,
  })
}
// The reminders go out over whichever channel is set up.
if ((features.webPush || features.apns) && env.NODE_ENV !== 'test') {
  startDailyReminders()
}
export default {
  port: env.PORT,
  fetch: app.fetch,
  idleTimeout: 30,
}
