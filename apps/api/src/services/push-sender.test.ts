import { beforeEach, describe, expect, it, vi } from 'vitest'

class FakeWebPushError extends Error {
  statusCode: number
  constructor(statusCode: number) {
    super('push failed')
    this.statusCode = statusCode
  }
}

const { state, fakeDb, sendNotification } = vi.hoisted(() => {
  const state: {
    subscriptions: Array<{ id: string; endpoint: string; p256dh: string; auth: string }>
    deleteCallCount: number
  } = {
    subscriptions: [],
    deleteCallCount: 0,
  }

  const fakeDb = {
    query: {
      pushSubscription: {
        findMany: async () => state.subscriptions,
      },
    },
    delete: () => ({
      where: () => {
        state.deleteCallCount += 1
        return Promise.resolve()
      },
    }),
  }

  const sendNotification = vi.fn()

  return { state, fakeDb, sendNotification }
})

vi.mock('../env', () => ({
  env: { VAPID_SUBJECT: 'mailto:test@test.local', VAPID_PUBLIC_KEY: 'pub', VAPID_PRIVATE_KEY: 'priv' },
  features: { passwordResetEmail: true, webPush: true },
}))

vi.mock('../db/client', () => ({
  schema: { pushSubscription: { id: { name: 'push_subscription.id' } } },
  db: fakeDb,
}))

vi.mock('web-push', () => ({
  default: { setVapidDetails: vi.fn(), sendNotification },
  WebPushError: FakeWebPushError,
}))

const { sendPushToUser } = await import('./push-sender')

const SUB = { id: 'sub-1', endpoint: 'https://push.example.com/a', p256dh: 'p', auth: 'a' }

describe('sendPushToUser', () => {
  beforeEach(() => {
    state.subscriptions = [SUB]
    state.deleteCallCount = 0
    sendNotification.mockReset()
  })

  it('sends to every subscription for the user and touches nothing else on success', async () => {
    sendNotification.mockResolvedValue(undefined)

    await sendPushToUser('user-1', { title: 'Hola', body: 'Test' })

    expect(sendNotification).toHaveBeenCalledTimes(1)
    expect(state.deleteCallCount).toBe(0)
  })

  it('deletes the subscription when the push service reports it gone (404/410)', async () => {
    sendNotification.mockRejectedValue(new FakeWebPushError(410))

    await sendPushToUser('user-1', { title: 'Hola', body: 'Test' })

    expect(state.deleteCallCount).toBe(1)
  })

  it('does not delete the subscription on a transient error', async () => {
    sendNotification.mockRejectedValue(new Error('network blip'))

    await sendPushToUser('user-1', { title: 'Hola', body: 'Test' })

    expect(state.deleteCallCount).toBe(0)
  })
})
