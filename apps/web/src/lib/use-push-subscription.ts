import { useCallback, useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

/**
 * The key is baked in at build time from VAPID_PUBLIC_KEY. Without it the browser
 * cannot subscribe at all, so the UI has to hide the toggle rather than offer a
 * switch that throws on flip.
 */
export function isPushConfigured(): boolean {
  return Boolean(VAPID_PUBLIC_KEY)
}

export function usePushSubscription() {
  const supported = isPushSupported()
  const configured = isPushConfigured()
  const [subscribed, setSubscribed] = useState(false)

  useEffect(() => {
    if (!supported) return
    let cancelled = false
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        if (!cancelled) setSubscribed(sub !== null && Notification.permission === 'granted')
      })
      .catch(() => {
        if (!cancelled) setSubscribed(false)
      })
    return () => {
      cancelled = true
    }
  }, [supported])

  const subscribeMutation = useMutation({
    mutationFn: async () => {
      if (!VAPID_PUBLIC_KEY) throw new Error('VITE_VAPID_PUBLIC_KEY no está configurada')
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') throw new Error('Permiso de notificaciones denegado')
      const registration = await navigator.serviceWorker.ready
      // subscribe() throws if a subscription already exists (e.g. left over from
      // a previous session) — reuse it instead of failing the toggle
      const subscription =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        }))
      await api.post('push/subscribe', { json: subscription.toJSON() })
      return subscription
    },
    onSuccess: () => setSubscribed(true),
  })

  const unsubscribeMutation = useMutation({
    mutationFn: async () => {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      if (!subscription) return
      await subscription.unsubscribe()
      await api.delete('push/subscribe', { json: { endpoint: subscription.endpoint } })
    },
    onSuccess: () => setSubscribed(false),
  })

  const subscribe = useCallback(() => subscribeMutation.mutate(), [subscribeMutation])
  const unsubscribe = useCallback(() => unsubscribeMutation.mutate(), [unsubscribeMutation])

  // Surfaced so a failed flip says why instead of leaving the toggle looking on.
  const error = subscribeMutation.error ?? unsubscribeMutation.error

  return {
    supported,
    configured,
    subscribed,
    subscribe,
    unsubscribe,
    error: error instanceof Error ? error.message : null,
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(new ArrayBuffer(rawData.length))
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i)
  return outputArray
}
