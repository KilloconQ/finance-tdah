/// <reference lib="webworker" />
export type {}

declare const self: ServiceWorkerGlobalScope

import { precacheAndRoute } from 'workbox-precaching'
import { clientsClaim } from 'workbox-core'
import { registerRoute } from 'workbox-routing'
import { NetworkFirst } from 'workbox-strategies'

precacheAndRoute(self.__WB_MANIFEST)

self.skipWaiting()
clientsClaim()

// mirrors the old generateSW runtimeCaching entry: API calls stay off the app-shell precache.
// /api/auth/* is deliberately excluded — caching session responses can hand a stale
// (or another account's) session back to the app and bounce people to sign-in.
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/') && !url.pathname.startsWith('/api/auth/'),
  new NetworkFirst({
    cacheName: 'api-cache',
    networkTimeoutSeconds: 5,
  }),
)

self.addEventListener('push', (event) => {
  let data: { title?: string; body?: string; url?: string } = {}
  try {
    data = event.data?.json() ?? {}
  } catch {
    // malformed or empty payload — still show a generic notification instead of dropping it
  }
  const title = data.title ?? 'Cada Quien'
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body,
      data: { url: data.url ?? '/' },
      icon: '/pwa-192x192.png',
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url ?? '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          await client.focus()
          if ('navigate' in client) await client.navigate(url)
          return
        }
      }
      return self.clients.openWindow(url)
    }),
  )
})
