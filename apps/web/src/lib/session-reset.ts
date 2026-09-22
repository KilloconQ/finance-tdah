import { authClient } from './auth-client'
import { queryClient } from './query-client'

/**
 * Wipes every cached server response.
 *
 * `queryClient` is a module-level singleton and the finance queries use
 * unscoped keys (`['accounts']`, `['dashboard', 'home']`, `['profile']`, …)
 * with a 30s `staleTime`. Without this, signing out and signing in as someone
 * else in the same tab lets route loaders read the previous user's financial
 * data straight from cache and render it before the first refetch lands.
 *
 * Called on both ends of a session change: signing out drops the data promptly,
 * and signing in covers the paths that never reach a sign-out at all — an
 * expired session bounced to /auth/sign-in by the `_app` guard, or a tab left
 * open from a previous session.
 */
export function clearSessionCache(): void {
  queryClient.clear()
}

/** Signs out and clears the cache even if the sign-out request itself fails. */
export async function signOutAndClear(): Promise<void> {
  try {
    await authClient.signOut()
  } finally {
    clearSessionCache()
  }
}
