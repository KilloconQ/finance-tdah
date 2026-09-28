import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { ApiError, fetchValidated } from './api'
import { queryClient } from './query-client'
import { setSessionExpiredHandler } from './session-reset'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

const itemSchema = z.object({ id: z.string(), amountCents: z.number().int() })

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  setSessionExpiredHandler(() => {})
  queryClient.clear()
})

describe('fetchValidated', () => {
  it('returns the parsed body when it matches the schema', async () => {
    fetchMock.mockResolvedValue(json({ id: 'a', amountCents: 1200 }))
    await expect(fetchValidated('/expenses/a', itemSchema)).resolves.toEqual({ id: 'a', amountCents: 1200 })
  })

  it('sends method, JSON body and search params under /api', async () => {
    let sentBody: unknown
    fetchMock.mockImplementation(async (req: Request) => {
      sentBody = await req.json()
      return json({ id: 'a', amountCents: 1 })
    })
    await fetchValidated('expenses', itemSchema, {
      method: 'POST',
      json: { amountCents: 1 },
      searchParams: { month: '2026-09', limit: 5 },
    })
    const req = fetchMock.mock.calls[0][0] as Request
    const url = new URL(req.url)
    expect(req.method).toBe('POST')
    expect(url.pathname).toBe('/api/expenses')
    expect(url.searchParams.get('month')).toBe('2026-09')
    expect(url.searchParams.get('limit')).toBe('5')
    expect(sentBody).toEqual({ amountCents: 1 })
    expect(req.credentials).toBe('include')
  })

  it('rejects a response that does not match the schema', async () => {
    fetchMock.mockResolvedValue(json({ id: 'a', amountCents: 12.5 }))
    await expect(fetchValidated('expenses/a', itemSchema)).rejects.toBeInstanceOf(z.ZodError)
  })

  it("throws an ApiError carrying the API's error message and body", async () => {
    fetchMock.mockResolvedValue(json({ error: 'Saldo insuficiente' }, 400))
    const err = await fetchValidated('expenses', itemSchema).catch((e: unknown) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect((err as ApiError).message).toBe('Saldo insuficiente')
    expect((err as ApiError).body).toEqual({ error: 'Saldo insuficiente' })
    expect((err as ApiError).response.status).toBe(400)
  })

  it('keeps a non-JSON error body as text', async () => {
    fetchMock.mockResolvedValue(new Response('Bad Gateway', { status: 400 }))
    const err = (await fetchValidated('expenses', itemSchema).catch((e: unknown) => e)) as ApiError
    expect(err.body).toBe('Bad Gateway')
  })

  it('on 401, clears the cached data and runs the session-expired handler', async () => {
    const onExpired = vi.fn()
    setSessionExpiredHandler(onExpired)
    queryClient.setQueryData(['accounts'], [{ id: 'someone-elses' }])
    fetchMock.mockResolvedValue(json({ error: 'Unauthorized' }, 401))

    await expect(fetchValidated('accounts', z.array(z.unknown()))).rejects.toBeInstanceOf(ApiError)
    expect(onExpired).toHaveBeenCalledOnce()
    expect(queryClient.getQueryData(['accounts'])).toBeUndefined()
  })

  it('does not treat other errors as an expired session', async () => {
    const onExpired = vi.fn()
    setSessionExpiredHandler(onExpired)
    fetchMock.mockResolvedValue(json({ error: 'Forbidden' }, 403))
    await expect(fetchValidated('accounts', z.unknown())).rejects.toBeInstanceOf(ApiError)
    expect(onExpired).not.toHaveBeenCalled()
  })
})
