import { beforeEach, describe, expect, it, vi } from 'vitest'
import { authClient } from './auth-client'
import { queryClient, SESSION_QUERY_KEY } from './query-client'

const notifyMock = vi.hoisted(() => vi.fn())
// better-fetch grabs `fetch` when the client is created, so stub it before import.
const fetchMock = vi.hoisted(() => {
  const f = vi.fn()
  globalThis.fetch = f
  return f
})
vi.mock('./auth-broadcast', () => ({ notifyAuthChange: notifyMock }))

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

const SESSION = { user: { id: 'u1' }, session: { id: 's1' } }

beforeEach(() => {
  fetchMock.mockReset()
  notifyMock.mockReset()
  queryClient.setQueryData(SESSION_QUERY_KEY, SESSION)
})

describe('authClient', () => {
  it('drops the cached session and tells other tabs after a successful auth call', async () => {
    fetchMock.mockResolvedValueOnce(json({ token: 't', user: { id: 'u2' } }))
    await authClient.signIn.email({ email: 'beto@ejemplo.com', password: 'password123' })
    expect(queryClient.getQueryData(SESSION_QUERY_KEY)).toBeUndefined()
    expect(notifyMock).toHaveBeenCalledOnce()
  })

  it('does the same after signing out', async () => {
    fetchMock.mockResolvedValueOnce(json({ success: true }))
    await authClient.signOut()
    expect(queryClient.getQueryData(SESSION_QUERY_KEY)).toBeUndefined()
    expect(notifyMock).toHaveBeenCalledOnce()
  })

  it('leaves the cache alone when merely reading the session', async () => {
    fetchMock.mockResolvedValueOnce(json(SESSION))
    await authClient.getSession()
    expect(queryClient.getQueryData(SESSION_QUERY_KEY)).toEqual(SESSION)
    expect(notifyMock).not.toHaveBeenCalled()
  })

  it('leaves the cache alone when the auth call fails', async () => {
    fetchMock.mockResolvedValueOnce(json({ code: 'INVALID_EMAIL_OR_PASSWORD' }, 401))
    const res = await authClient.signIn.email({ email: 'ana@ejemplo.com', password: 'mala-clave' })
    expect(res.error?.status).toBe(401)
    expect(queryClient.getQueryData(SESSION_QUERY_KEY)).toEqual(SESSION)
    expect(notifyMock).not.toHaveBeenCalled()
  })
})
