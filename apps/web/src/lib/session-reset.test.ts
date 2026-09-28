import { afterEach, describe, expect, it, vi } from 'vitest'
import { queryClient } from './query-client'
import {
  clearSessionCache,
  handleSessionExpired,
  setSessionExpiredHandler,
  signOutAndClear,
  syncSessionCache,
} from './session-reset'

const signOutMock = vi.hoisted(() => vi.fn())
vi.mock('./auth-client', () => ({ authClient: { signOut: signOutMock } }))

const seed = () => queryClient.setQueryData(['accounts'], [{ id: 'acc' }])
const cached = () => queryClient.getQueryData(['accounts'])

afterEach(() => {
  clearSessionCache()
  setSessionExpiredHandler(() => {})
})

describe('syncSessionCache', () => {
  it("drops the previous user's data when the tab changes hands", () => {
    syncSessionCache('ana')
    seed()
    expect(syncSessionCache('beto')).toBe(true)
    expect(cached()).toBeUndefined()
  })

  it('keeps the data while the same user stays signed in', () => {
    syncSessionCache('ana')
    seed()
    expect(syncSessionCache('ana')).toBe(false)
    expect(cached()).toEqual([{ id: 'acc' }])
  })

  it('treats the first user after a clear as a new owner', () => {
    syncSessionCache('ana')
    clearSessionCache()
    seed()
    expect(syncSessionCache('ana')).toBe(true)
    expect(cached()).toBeUndefined()
  })
})

describe('signOutAndClear', () => {
  it('clears the cache after signing out', async () => {
    signOutMock.mockResolvedValue({ data: {}, error: null })
    seed()
    await signOutAndClear()
    expect(signOutMock).toHaveBeenCalledOnce()
    expect(cached()).toBeUndefined()
  })

  it('clears the cache even when the sign-out request fails', async () => {
    signOutMock.mockRejectedValue(new TypeError('Failed to fetch'))
    seed()
    await expect(signOutAndClear()).rejects.toThrow()
    expect(cached()).toBeUndefined()
  })
})

describe('handleSessionExpired', () => {
  it('clears the cache and calls the registered handler', () => {
    const handler = vi.fn()
    setSessionExpiredHandler(handler)
    syncSessionCache('ana')
    seed()
    handleSessionExpired()
    expect(cached()).toBeUndefined()
    expect(handler).toHaveBeenCalledOnce()
    // The owner was forgotten too: the same user signing back in starts clean.
    expect(syncSessionCache('ana')).toBe(true)
  })
})
