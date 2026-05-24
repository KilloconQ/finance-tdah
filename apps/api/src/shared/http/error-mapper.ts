import type { Context } from 'hono'
import { DomainError } from '../errors/domain-error'

// Allowed HTTP status codes for domain errors
type DomainStatus = 400 | 401 | 403 | 404 | 409 | 422

export function mapErrorToResponse(err: unknown, c: Context): Response | null {
  if (err instanceof DomainError) {
    // Preserve the existing wire format: { error: <Spanish message> }
    // matching today's `return c.json({ error: 'Cuenta no encontrada' }, 404)`.
    return c.json({ error: err.message }, err.status as DomainStatus) as Response
  }
  // Not a domain error — let the existing 500 handler run.
  return null
}
