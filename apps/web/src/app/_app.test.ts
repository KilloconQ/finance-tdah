import { isRedirect } from '@tanstack/react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { queryClient, SESSION_QUERY_KEY } from '@/lib/query-client'
import { SessionCheckError } from '@/lib/session'
import { clearSessionCache } from '@/lib/session-reset'
import { Route } from './_app'

const getSessionMock = vi.hoisted(() => vi.fn())
vi.mock('@/lib/auth-client', () => ({ authClient: { getSession: getSessionMock } }))

const session = (id: string) => ({ user: { id, email: `${id}@ejemplo.com` }, session: { id: `s-${id}` } })

// The guard only reads what it needs; the router context isn't part of that.
const runGuard = () => (Route.options.beforeLoad as unknown as () => Promise<{ user: { id: string } }>)()

beforeEach(() => {
  getSessionMock.mockReset()
})

afterEach(() => {
  clearSessionCache()
})

describe('_app guard', () => {
  it('lets a signed-in user through and exposes them to child routes', async () => {
    getSessionMock.mockResolvedValue({ data: session('ana'), error: null })
    await expect(runGuard()).resolves.toEqual({ user: session('ana').user })
  })

  it('redirects to sign-in when nobody is signed in, without caching the null', async () => {
    getSessionMock.mockResolvedValue({ data: null, error: null })
    const thrown = await runGuard().catch((e: unknown) => e)
    expect(isRedirect(thrown)).toBe(true)
    expect((thrown as { options: { to: string } }).options.to).toBe('/auth/sign-in')

    // Signing in (e.g. from another tab) must not bounce off a cached null.
    getSessionMock.mockResolvedValue({ data: session('ana'), error: null })
    await expect(runGuard()).resolves.toEqual({ user: session('ana').user })
  })

  it('throws SessionCheckError, not a redirect, when the check itself fails', async () => {
    getSessionMock.mockResolvedValue({ data: null, error: { status: 429 } })
    const thrown = await runGuard().catch((e: unknown) => e)
    expect(isRedirect(thrown)).toBe(false)
    expect(thrown).toBeInstanceOf(SessionCheckError)
  })

  it('reuses the session across navigations', async () => {
    getSessionMock.mockResolvedValue({ data: session('ana'), error: null })
    await runGuard()
    await runGuard()
    await runGuard()
    expect(getSessionMock).toHaveBeenCalledOnce()
  })

  it("drops the previous user's data when someone else signs in, but keeps the new session", async () => {
    getSessionMock.mockResolvedValue({ data: session('ana'), error: null })
    await runGuard()
    queryClient.setQueryData(['accounts'], [{ id: 'ana-account' }])

    queryClient.removeQueries({ queryKey: SESSION_QUERY_KEY })
    getSessionMock.mockResolvedValue({ data: session('beto'), error: null })
    await expect(runGuard()).resolves.toEqual({ user: session('beto').user })

    expect(queryClient.getQueryData(['accounts'])).toBeUndefined()
    expect(queryClient.getQueryData(SESSION_QUERY_KEY)).toEqual(session('beto'))
    await runGuard()
    expect(getSessionMock).toHaveBeenCalledTimes(2)
  })
})
