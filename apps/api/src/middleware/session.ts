import type { MiddlewareHandler } from 'hono'
import { auth } from '../auth'

export type SessionVariables = {
  user: typeof auth.$Infer.Session.user
  session: typeof auth.$Infer.Session.session
}

export const sessionMiddleware: MiddlewareHandler<{ Variables: SessionVariables }> = async (
  c,
  next,
) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers })

  if (!session) {
    return c.json({ error: 'No autenticado' }, 401)
  }

  c.set('user', session.user)
  c.set('session', session.session)
  await next()
}
