import ky, { HTTPError } from 'ky'
import type { z } from 'zod'

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
    beforeError: [
      async (err) => {
        const body = await safeBody(err.response)
        return new ApiError(err, body, errorMessage(body))
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
    if (typeof v === 'string') return v
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
  const resp = await api(cleanPath, {
    method,
    json: init?.json,
    searchParams: init?.searchParams,
  })
  const data = await resp.json()
  return schema.parse(data)
}
