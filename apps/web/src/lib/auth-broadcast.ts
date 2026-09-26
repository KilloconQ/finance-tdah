/**
 * Tells the app's other tabs that who is signed in may have changed.
 *
 * The session cookie is shared by every tab, but each tab caches the session
 * (and the finance data read under it). Without this, signing in as someone
 * else in one tab leaves the others showing the previous user's cached data
 * until their session copy goes stale. BroadcastChannel never delivers to the
 * sender, so the tab that made the change isn't affected.
 *
 * Deliberately import-free: `auth-client` posts from here and `main.tsx`
 * listens, and neither can import the other.
 */
const CHANNEL = 'finance-tdah:auth'

const channel = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(CHANNEL)

export function notifyAuthChange(): void {
  channel?.postMessage('changed')
}

export function onAuthChange(listener: () => void): void {
  channel?.addEventListener('message', listener)
}
