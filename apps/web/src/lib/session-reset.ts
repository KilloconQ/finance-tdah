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
 * the tab changes hands, before any route loader gets to read it.
 */
export function syncSessionCache(userId: string): void {
  if (cachedUserId === userId) return
  queryClient.clear()
  cachedUserId = userId
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
