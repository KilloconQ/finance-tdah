import { describe, expect, it, vi } from 'vitest'

// Separate file so the module registry sees VAPID as unconfigured at import time.
const { findMany, sendNotification, setVapidDetails } = vi.hoisted(() => ({
  findMany: vi.fn(async () => []),
  sendNotification: vi.fn(),
  setVapidDetails: vi.fn(),
}))

vi.mock('../env', () => ({
  env: { VAPID_SUBJECT: 'mailto:test@test.local' },
  features: { passwordResetEmail: false, webPush: false },
}))

vi.mock('../db/client', () => ({
  schema: { pushSubscription: { id: { name: 'push_subscription.id' } } },
  db: { query: { pushSubscription: { findMany } } },
}))

vi.mock('web-push', () => ({
  default: { setVapidDetails, sendNotification },
  WebPushError: class extends Error {},
}))

const { sendPushToUser } = await import('./push-sender')

describe('sendPushToUser without VAPID keys', () => {
  it('never configures web-push at import time, so the api still boots', () => {
    expect(setVapidDetails).not.toHaveBeenCalled()
  })

  it('skips silently instead of throwing', async () => {
    await expect(sendPushToUser('user-1', { title: 'Hola', body: 'Test' })).resolves.toBeUndefined()

    expect(findMany).not.toHaveBeenCalled()
    expect(sendNotification).not.toHaveBeenCalled()
  })
})
