import { describe, expect, it, vi } from 'vitest'
import { Hono } from 'hono'

// Separate file: the route reads the feature flag at request time, but the env
// mock has to be in place before the module graph loads.
const { pushSubscription, fakeDb, deleteCalls } = vi.hoisted(() => {
  const deleteCalls: number[] = []
  return {
    pushSubscription: { id: { name: 'id' }, endpoint: { name: 'endpoint' }, userId: { name: 'user_id' } },
    deleteCalls,
    fakeDb: {
      insert: () => {
        throw new Error('should never reach the database')
      },
      delete: () => ({
        where: () => ({
          returning: async () => {
            deleteCalls.push(1)
            return [{ id: 'sub-1' }]
          },
        }),
      }),
    },
  }
})

vi.mock('../env', () => ({
  env: {},
  features: { passwordResetEmail: false, webPush: false },
}))

vi.mock('../middleware/session', () => ({
  sessionMiddleware: async (c: { set: (k: string, v: unknown) => void }, next: () => Promise<void>) => {
    c.set('user', { id: 'user-1' })
    await next()
  },
}))

vi.mock('../db/client', () => ({ schema: { pushSubscription }, db: fakeDb }))

const { pushRoute } = await import('./push')
const app = new Hono().route('/', pushRoute)

const VALID_SUBSCRIPTION = {
  endpoint: 'https://push.example.com/abc',
  keys: { p256dh: 'p256dh-key', auth: 'auth-key' },
}

describe('push routes without VAPID configured', () => {
  it('refuses to subscribe instead of storing a subscription nothing can send to', async () => {
    const res = await app.request('/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(VALID_SUBSCRIPTION),
    })

    expect(res.status).toBe(503)
    expect(await res.json()).toEqual({
      error: 'Las notificaciones no están configuradas en el servidor.',
    })
  })

  it('still allows unsubscribing, so a stale subscription can always be cleaned up', async () => {
    const res = await app.request('/subscribe', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: VALID_SUBSCRIPTION.endpoint }),
    })

    expect(res.status).toBe(200)
    expect(deleteCalls).toHaveLength(1)
  })
})
