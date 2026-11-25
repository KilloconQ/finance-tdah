import type { MiddlewareHandler } from 'hono'
import { auth } from '../auth'
import { features } from '../env'
import { accessFor } from '../lib/access'

// Still reachable without a subscription: onboarding/account deletion, the paywall's own status, admin.
const OPEN = ['/api/profile', '/api/billing', '/api/admin']

/** 402 for a signed-in user with no access. Anonymous requests fall through to the route's own 401. */
export const accessGate: MiddlewareHandler = async (c, next) => {
  if (!features.billing || OPEN.some((p) => c.req.path.startsWith(p))) return next()
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (session && (await accessFor(session.user)) === 'none') {
    return c.json({ error: 'Necesitas una suscripción activa.', code: 'PAYMENT_REQUIRED' }, 402)
  }
  return next()
}
