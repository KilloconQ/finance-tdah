import { queryOptions } from '@tanstack/react-query'
import { authClient } from './auth-client'
import { authErrorMessage, thrownErrorMessage } from './auth-errors'
import { queryClient, SESSION_QUERY_KEY } from './query-client'

/**
 * The session check failed — the server could not say whether you are signed
 * in (429, 5xx, offline). Distinct from "no session", which is `null`: only
 * that one sends you to sign-in.
 */
export class SessionCheckError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SessionCheckError'
  }
}

const CHECK_FAILED = 'No pudimos comprobar tu sesión.'

/**
 * The browser can't read the httpOnly session cookie, so the SPA has to ask the
 * server who is signed in. That answer only drives UI — every API call checks
 * the cookie again — so it can be reused instead of re-asked on each
 * navigation and link hover. 5 min matches the server's own `cookieCache`.
 *
 * A stale copy is corrected by:
 * - any auth call that changes the session (`auth-client` drops the cache),
 * - the first 401 from the API (`api.ts` → `handleSessionExpired`),
 * - coming back to the tab (`main.tsx` marks it stale).
 */
export const sessionQuery = queryOptions({
  queryKey: SESSION_QUERY_KEY,
  queryFn: async () => {
    let res: Awaited<ReturnType<typeof authClient.getSession>>
    try {
      res = await authClient.getSession()
    } catch (err) {
      throw new SessionCheckError(thrownErrorMessage(err, CHECK_FAILED))
    }
    if (res.error) throw new SessionCheckError(authErrorMessage(res.error, CHECK_FAILED))
    return res.data ?? null
  },
  staleTime: 5 * 60_000,
  // Retrying a 429 only digs the hole deeper; the error screen has a retry button.
  retry: false,
})

export type SessionData = NonNullable<Awaited<ReturnType<NonNullable<typeof sessionQuery.queryFn>>>>

/** Resolves the session from cache when fresh, from the server otherwise. */
export function getSession(): Promise<SessionData | null> {
  return queryClient.fetchQuery(sessionQuery)
}

/** Forces the next `getSession()` to ask the server. */
export function forgetSession(): void {
  queryClient.removeQueries({ queryKey: SESSION_QUERY_KEY })
}
