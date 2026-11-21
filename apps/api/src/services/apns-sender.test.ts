import { beforeEach, describe, expect, it, vi } from 'vitest'

const { state, fakeDb, pem } = await vi.hoisted(async () => {
  const { generateKeyPairSync } = await import('node:crypto')
  const pem = generateKeyPairSync('ec', { namedCurve: 'prime256v1' }).privateKey.export({ type: 'pkcs8', format: 'pem' }).toString()
  const state: {
    devices: Array<{ id: string; token: string; environment: string }>
    deletedIds: string[]
  } = { devices: [], deletedIds: [] }
  const fakeDb = {
    query: { deviceToken: { findMany: async () => state.devices } },
    delete: () => ({
      where: () => {
        state.deletedIds.push('deleted')
        return Promise.resolve()
      },
    }),
  }
  return { state, fakeDb, pem }
})

const envMock = vi.hoisted(() => ({
  APNS_KEY_ID: 'ABC123DEFG' as string | undefined,
  APNS_TEAM_ID: 'TEAM123456' as string | undefined,
  APNS_BUNDLE_ID: 'app.cadaquien.ios',
  APNS_PRIVATE_KEY: undefined as string | undefined,
}))

vi.mock('../env', () => ({ env: envMock, features: { webPush: false, apns: true } }))
vi.mock('../db/client', () => ({ db: fakeDb, schema: { deviceToken: { id: 'id' } } }))
vi.mock('../lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }))

const { sendApnsToUser, buildApnsBody, isDeadToken } = await import('./apns-sender')
import type { ApnsTransport } from './apns-sender'
const { logger } = await import('../lib/logger')

const DEVICE = (token: string, environment = 'production', id = token) => ({ id, token, environment })
const payload = { title: '¿Gastaste algo?', body: 'Anótalo', url: '/add-expense' }
const ok = { status: 200 }

describe('sendApnsToUser', () => {
  beforeEach(() => {
    envMock.APNS_KEY_ID = 'ABC123DEFG'
    envMock.APNS_TEAM_ID = 'TEAM123456'
    envMock.APNS_PRIVATE_KEY = pem
    state.devices = []
    state.deletedIds = []
    vi.mocked(logger.error).mockClear()
  })

  it('sends one request per device to the host of its environment, as Apple expects', async () => {
    state.devices = [DEVICE('aa', 'production'), DEVICE('bb', 'sandbox')]
    const transport = vi.fn<ApnsTransport>(async () => ok)

    await sendApnsToUser('u1', payload, transport, () => 1_700_000_000)

    expect(transport).toHaveBeenCalledTimes(2)
    const calls = transport.mock.calls.map(([request]) => request)
    expect(calls.find((r) => r.deviceToken === 'aa')!.host).toBe('api.push.apple.com')
    expect(calls.find((r) => r.deviceToken === 'bb')!.host).toBe('api.sandbox.push.apple.com')
    expect(calls[0]!.headers).toMatchObject({
      'apns-topic': 'app.cadaquien.ios',
      'apns-push-type': 'alert',
      'apns-priority': '10',
      'content-type': 'application/json',
    })
    expect(calls[0]!.headers.authorization).toMatch(/^bearer [\w-]+\.[\w-]+\.[\w-]+$/)
  })

  it('sends the aps envelope plus the url the app turns into a link', async () => {
    state.devices = [DEVICE('aa')]
    const transport = vi.fn<ApnsTransport>(async () => ok)
    await sendApnsToUser('u1', payload, transport)
    expect(JSON.parse(transport.mock.calls[0]![0].body)).toEqual({
      aps: { alert: { title: '¿Gastaste algo?', body: 'Anótalo' }, sound: 'default' },
      url: '/add-expense',
    })
  })

  it('reuses the provider token for 50 minutes, then makes a new one', async () => {
    state.devices = [DEVICE('aa')]
    const transport = vi.fn<ApnsTransport>(async () => ok)
    const auth = () => transport.mock.calls.at(-1)![0].headers.authorization

    await sendApnsToUser('u1', payload, transport, () => 1_800_000_000)
    const first = auth()
    await sendApnsToUser('u1', payload, transport, () => 1_800_000_000 + 49 * 60)
    expect(auth()).toBe(first)
    await sendApnsToUser('u1', payload, transport, () => 1_800_000_000 + 51 * 60)
    expect(auth()).not.toBe(first)
  })

  it.each([
    [{ status: 410, reason: 'Unregistered' }],
    [{ status: 400, reason: 'BadDeviceToken' }],
    [{ status: 400, reason: 'DeviceTokenNotForTopic' }],
  ])('forgets a token Apple says is gone for good: %j', async (response) => {
    state.devices = [DEVICE('aa')]
    await sendApnsToUser('u1', payload, async () => response)
    expect(state.deletedIds).toHaveLength(1)
    expect(logger.error).not.toHaveBeenCalled()
  })

  it.each([
    [{ status: 403, reason: 'InvalidProviderToken' }],
    [{ status: 429, reason: 'TooManyRequests' }],
    [{ status: 500, reason: 'InternalServerError' }],
    [{ status: 400, reason: 'PayloadEmpty' }],
  ])('keeps the token on a failure that is not about the device: %j', async (response) => {
    state.devices = [DEVICE('aa')]
    await sendApnsToUser('u1', payload, async () => response)
    expect(state.deletedIds).toHaveLength(0)
    expect(logger.error).toHaveBeenCalledWith('apns_send_failed', expect.objectContaining({ status: response.status }))
  })

  it('one device failing never stops the others, and nothing is thrown', async () => {
    state.devices = [DEVICE('aa'), DEVICE('bb'), DEVICE('cc')]
    const transport = vi.fn<ApnsTransport>(async ({ deviceToken }) => {
      if (deviceToken === 'aa') throw new Error('socket hang up')
      return ok
    })
    await expect(sendApnsToUser('u1', payload, transport)).resolves.toBeUndefined()
    expect(transport).toHaveBeenCalledTimes(3)
    expect(logger.error).toHaveBeenCalledWith('apns_send_failed', expect.objectContaining({ message: 'socket hang up' }))
  })

  it('does nothing without devices', async () => {
    const transport = vi.fn<ApnsTransport>(async () => ok)
    await sendApnsToUser('u1', payload, transport)
    expect(transport).not.toHaveBeenCalled()
  })

  it('does nothing when APNs is not configured', async () => {
    envMock.APNS_PRIVATE_KEY = undefined
    state.devices = [DEVICE('aa')]
    const transport = vi.fn<ApnsTransport>(async () => ok)
    await sendApnsToUser('u1', payload, transport)
    expect(transport).not.toHaveBeenCalled()
  })
})

describe('buildApnsBody / isDeadToken', () => {
  it('leaves url out when there is none', () => {
    expect(JSON.parse(buildApnsBody({ title: 'a', body: 'b' }))).toEqual({
      aps: { alert: { title: 'a', body: 'b' }, sound: 'default' },
    })
  })

  it('treats only a vanished device as a dead token', () => {
    expect(isDeadToken({ status: 410 })).toBe(true)
    expect(isDeadToken({ status: 400, reason: 'BadDeviceToken' })).toBe(true)
    expect(isDeadToken({ status: 400, reason: 'BadTopic' })).toBe(false)
    expect(isDeadToken({ status: 200 })).toBe(false)
  })
})
