import ky, { HTTPError } from 'ky'
import type { z } from 'zod'
import { OFFLINE, TIMEOUT, statusMessage, translateMessage } from './auth-errors'
import { handleSessionExpired } from './session-reset'

export class ApiError extends HTTPError {
  body: unknown
  constructor(error: HTTPError, body: unknown, friendly?: string) {
    super(error.response, error.request, error.options)
    this.name = 'ApiError'
    this.body = body
    if (friendly) this.message = friendly
  }
}

const baseUrl = import.meta.env.VITE_API_URL ?? '/api'

export const api = ky.create({
  prefixUrl: baseUrl.replace(/\/$/, ''),
  credentials: 'include',
  retry: { limit: 1 },
  hooks: {
    afterResponse: [
      (_request, _options, response) => {
        // Only `sessionMiddleware` answers 401, so this always means the
        // session is gone — caught here once instead of at every screen.
        if (response.status === 401) handleSessionExpired()
      },
    ],
    beforeError: [
      async (err) => {
        const body = await safeBody(err.response)
        return new ApiError(err, body, errorMessage(body) ?? statusMessage(err.response.status))
      },
    ],
  },
})

async function safeBody(res: Response): Promise<unknown> {
  try {
    return await res.clone().json()
  } catch {
    return await res.clone().text().catch(() => null)
  }
}

function errorMessage(body: unknown): string | undefined {
  if (body && typeof body === 'object' && 'error' in body) {
    const v = (body as { error: unknown }).error
    if (typeof v === 'string' && v) return translateMessage(v)
  }
  return undefined
}

/**
 * Wrapper: hace la request, valida con Zod y devuelve los datos tipados.
 * Si la respuesta no matchea el schema, tira un Error.
 */
export async function fetchValidated<S extends z.ZodType>(
  path: string,
  schema: S,
  init?: { method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'; json?: unknown; searchParams?: Record<string, string | number> },
): Promise<z.infer<S>> {
  const method = init?.method ?? 'GET'
  const cleanPath = path.replace(/^\//, '')
  let resp: Response
  try {
    resp = await api(cleanPath, {
      method,
      json: init?.json,
      searchParams: init?.searchParams,
    })
  } catch (err) {
    if (err instanceof HTTPError) throw err
    if (err instanceof Error && err.name === 'TimeoutError') throw new Error(TIMEOUT, { cause: err })
    if (err instanceof TypeError) throw new Error(OFFLINE, { cause: err })
    throw err
  }
  const data = await resp.json()
  return schema.parse(data)
}
