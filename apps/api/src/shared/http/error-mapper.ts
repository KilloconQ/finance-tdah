import type { Context } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { DomainError } from '../errors/domain-error'

// Allowed HTTP status codes for domain errors
type DomainStatus = 400 | 401 | 403 | 404 | 409 | 422

export function mapErrorToResponse(err: unknown, c: Context): Response | null {
  if (err instanceof DomainError) {
    // Preserve the existing wire format: { error: <Spanish message> }
    // matching today's `return c.json({ error: 'Cuenta no encontrada' }, 404)`.
    return c.json({ error: err.message }, err.status as DomainStatus) as Response
  }
  if (err instanceof HTTPException) {
    // zValidator('json') throws a 400 HTTPException when the body isn't parseable JSON.
    if (err.status === 400 && /malformed json/i.test(err.message)) {
      return c.json({ error: 'El cuerpo de la solicitud no es un JSON válido' }, 400) as Response
    }
    return err.getResponse()
  }
  if (pgError(err)) {
    return c.json({ error: uniqueViolationMessage(err) }, 409) as Response
  }
  // Not a domain error — let the existing 500 handler run.
  return null
}

// Drizzle wraps the driver error in `cause`; Postgres unique_violation is 23505.
function pgError(err: unknown): { constraint_name?: string; constraint?: string } | null {
  let e: unknown = err
  for (let i = 0; e && typeof e === 'object' && i < 3; i++, e = (e as { cause?: unknown }).cause) {
    if ((e as { code?: unknown }).code === '23505') return e as { constraint_name?: string; constraint?: string }
  }
  return null
}

function uniqueViolationMessage(err: unknown): string {
  const e = pgError(err)
  const name = e?.constraint_name ?? e?.constraint
  return name === 'financial_account_user_name_idx'
    ? 'Ya tienes una cuenta con ese nombre'
    : 'Ya existe un registro con esos datos'
}
