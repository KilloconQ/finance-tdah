import { beforeEach, describe, expect, it, vi } from 'vitest'

const { featuresMock, sendApnsToUser, findMany, sendNotification } = vi.hoisted(() => ({
  featuresMock: { webPush: true, apns: true },
  sendApnsToUser: vi.fn(),
  findMany: vi.fn(),
  sendNotification: vi.fn(),
}))

vi.mock('../env', () => ({
  env: { VAPID_SUBJECT: 'mailto:t@t.local', VAPID_PUBLIC_KEY: 'pub', VAPID_PRIVATE_KEY: 'priv' },
  features: featuresMock,
}))
vi.mock('../db/client', () => ({
  db: { query: { pushSubscription: { findMany } }, delete: () => ({ where: async () => {} }) },
  schema: { pushSubscription: { id: 'id' } },
}))
vi.mock('../lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }))
vi.mock('./apns-sender', () => ({ sendApnsToUser }))
vi.mock('web-push', () => ({
  default: { setVapidDetails: vi.fn(), sendNotification },
  WebPushError: class extends Error {},
}))

const { sendPushToUser } = await import('./push-sender')
const { logger } = await import('../lib/logger')
const payload = { title: 't', body: 'b' }

describe('sendPushToUser across channels', () => {
  beforeEach(() => {
    featuresMock.webPush = true
    featuresMock.apns = true
    sendApnsToUser.mockReset().mockResolvedValue(undefined)
    findMany.mockReset().mockResolvedValue([{ id: 's1', endpoint: 'https://e', p256dh: 'k', auth: 'a' }])
    sendNotification.mockReset().mockResolvedValue(undefined)
    vi.mocked(logger.warn).mockClear()
  })

  it('reaches a browser and an iPhone', async () => {
    await sendPushToUser('u1', payload)
    expect(sendNotification).toHaveBeenCalledTimes(1)
    expect(sendApnsToUser).toHaveBeenCalledWith('u1', payload)
  })

  it('works with only an iPhone channel configured', async () => {
    featuresMock.webPush = false
    await sendPushToUser('u1', payload)
    expect(sendApnsToUser).toHaveBeenCalledTimes(1)
    expect(findMany).not.toHaveBeenCalled()
    expect(logger.warn).not.toHaveBeenCalled()
  })

  it('works with only web push configured, and never touches APNs (the existing behaviour)', async () => {
    featuresMock.apns = false
    await sendPushToUser('u1', payload)
    expect(sendNotification).toHaveBeenCalledTimes(1)
    expect(sendApnsToUser).not.toHaveBeenCalled()
  })

  it('skips with a warning when neither channel is configured', async () => {
    featuresMock.webPush = false
    featuresMock.apns = false
    await sendPushToUser('u1', payload)
    expect(sendNotification).not.toHaveBeenCalled()
    expect(sendApnsToUser).not.toHaveBeenCalled()
    expect(logger.warn).toHaveBeenCalledWith('push_skipped', expect.anything())
  })

  it('a failing channel never blocks the other', async () => {
    sendApnsToUser.mockRejectedValue(new Error('apns exploded'))
    await expect(sendPushToUser('u1', payload)).resolves.toBeUndefined()
    expect(sendNotification).toHaveBeenCalledTimes(1)

    sendApnsToUser.mockResolvedValue(undefined)
    findMany.mockRejectedValue(new Error('db hiccup'))
    await expect(sendPushToUser('u1', payload)).resolves.toBeUndefined()
    expect(sendApnsToUser).toHaveBeenCalledTimes(2)
  })
})
