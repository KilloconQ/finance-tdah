/// <reference lib="webworker" />
export type {}

declare const self: ServiceWorkerGlobalScope

import { precacheAndRoute } from 'workbox-precaching'
import { clientsClaim } from 'workbox-core'

precacheAndRoute(self.__WB_MANIFEST)

self.skipWaiting()
clientsClaim()

// No runtime caching for /api/*. Every API response here is user-scoped, and
// workbox keys its cache by URL alone — not by the session cookie — so a
// NetworkFirst entry for /api/accounts survives a logout and can be replayed to
// whoever signs in next on the same device (the 5s network timeout was enough to
// trigger it). Unregistered requests go straight to the network, which is what
// authenticated data needs; TanStack Query already handles in-memory caching.
// Any future offline support has to partition per user and clear on sign-out.

// Drop the cache a previous version of this worker populated.
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.delete('api-cache'))
})

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
