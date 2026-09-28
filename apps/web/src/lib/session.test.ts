import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { queryClient, SESSION_QUERY_KEY } from './query-client'
import { forgetSession, getSession, SessionCheckError } from './session'

const getSessionMock = vi.hoisted(() => vi.fn())
vi.mock('./auth-client', () => ({ authClient: { getSession: getSessionMock } }))

const SESSION = { user: { id: 'u1', email: 'ana@ejemplo.com' }, session: { id: 's1' } }

beforeEach(() => {
  getSessionMock.mockReset()
})

afterEach(() => {
  vi.useRealTimers()
  queryClient.clear()
})

describe('getSession', () => {
  it('returns the signed-in session', async () => {
    getSessionMock.mockResolvedValue({ data: SESSION, error: null })
    await expect(getSession()).resolves.toEqual(SESSION)
  })

  it('returns null when nobody is signed in', async () => {
    getSessionMock.mockResolvedValue({ data: null, error: null })
    await expect(getSession()).resolves.toBeNull()
  })

  it('reuses the cached session instead of asking the server again', async () => {
    getSessionMock.mockResolvedValue({ data: SESSION, error: null })
    await getSession()
    await getSession()
    await getSession()
    expect(getSessionMock).toHaveBeenCalledOnce()
  })

  it('asks again once the cached copy is older than five minutes', async () => {
    vi.useFakeTimers()
    getSessionMock.mockResolvedValue({ data: SESSION, error: null })
    await getSession()
    vi.advanceTimersByTime(4 * 60_000)
    await getSession()
    expect(getSessionMock).toHaveBeenCalledOnce()
    vi.advanceTimersByTime(2 * 60_000)
    await getSession()
    expect(getSessionMock).toHaveBeenCalledTimes(2)
  })

  it('asks again after forgetSession()', async () => {
    getSessionMock.mockResolvedValue({ data: SESSION, error: null })
    await getSession()
    forgetSession()
    expect(queryClient.getQueryData(SESSION_QUERY_KEY)).toBeUndefined()
    await getSession()
    expect(getSessionMock).toHaveBeenCalledTimes(2)
  })

  it('throws SessionCheckError, not null, when the server answers with an error', async () => {
    getSessionMock.mockResolvedValue({ data: null, error: { status: 429, message: 'Too many requests' } })
    const err = await getSession().catch((e: unknown) => e)
    expect(err).toBeInstanceOf(SessionCheckError)
    expect((err as Error).message).toMatch(/Demasiados intentos/)
  })

  it('throws SessionCheckError when the request never completes (offline)', async () => {
    getSessionMock.mockRejectedValue(new TypeError('Failed to fetch'))
    const err = await getSession().catch((e: unknown) => e)
    expect(err).toBeInstanceOf(SessionCheckError)
    expect((err as Error).message).toMatch(/No pudimos conectar/)
  })

  it('does not retry a failed check, and does not cache the failure', async () => {
    getSessionMock.mockResolvedValueOnce({ data: null, error: { status: 503 } })
    await expect(getSession()).rejects.toBeInstanceOf(SessionCheckError)
    expect(getSessionMock).toHaveBeenCalledOnce()

    getSessionMock.mockResolvedValueOnce({ data: SESSION, error: null })
    await expect(getSession()).resolves.toEqual(SESSION)
  })
})
