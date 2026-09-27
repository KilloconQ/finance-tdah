import { authClient } from './auth-client'
import { queryClient } from './query-client'

/**
 * Keeps the query cache from outliving the session that filled it.
 *
 * `queryClient` is a module-level singleton and the finance queries use
 * unscoped keys (`['accounts']`, `['dashboard', 'home']`, `['profile']`, …)
 * with a 30s `staleTime`, so anything left in it is readable by whoever holds
 * the tab next.
 *
 * The rule is enforced in one place — `syncSessionCache()` in the `_app`
 * guard — rather than at each auth screen. Every path into the authenticated
 * app goes through that guard, so sign-in, sign-up (via onboarding), an
 * expired session and any auth flow added later are all covered without having
 * to remember to call anything.
 */

/** The user the cache currently belongs to. Null means "nobody / unknown". */
let cachedUserId: string | null = null

/**
 * Called by the `_app` guard once the session is known. Drops the cache when
 * the tab changes hands, before any route loader gets to read it. Returns
 * whether it did, so the guard can put the session it just read back.
 */
export function syncSessionCache(userId: string): boolean {
  if (cachedUserId === userId) return false
  queryClient.clear()
  cachedUserId = userId
  return true
}

/** Drops the cache and forgets whose it was. */
export function clearSessionCache(): void {
  queryClient.clear()
  cachedUserId = null
}

/** Signs out and clears the cache even if the sign-out request itself fails. */
export async function signOutAndClear(): Promise<void> {
  try {
    await authClient.signOut()
  } finally {
    clearSessionCache()
  }
}

let onSessionExpired: (() => void) | null = null

/**
 * Registers where to send the user when the API says the session is gone.
 * `main.tsx` wires this to the router so `api.ts` doesn't have to import it
 * (the router imports every route, which import `api.ts`).
 */
export function setSessionExpiredHandler(handler: () => void): void {
  onSessionExpired = handler
}

/**
 * The API answered 401: the session expired or was ended elsewhere (sign-out
 * on another device, account deleted). Drop everything this tab knew about
 * the user and go to sign-in.
 */
export function handleSessionExpired(): void {
  clearSessionCache()
  onSessionExpired?.()
}
