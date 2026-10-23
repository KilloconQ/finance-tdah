import { describe, it, expect, vi } from 'vitest'
import { HTTPException } from 'hono/http-exception'
import { mapErrorToResponse } from './error-mapper'
import { DomainError } from '../errors/domain-error'
import { NotFoundError } from '../errors/not-found.error'
import { NotOwnedError } from '../errors/not-owned.error'

// Minimal Context stub
function makeContext() {
  const jsonFn = vi.fn((body: unknown, s?: number) => ({ body, status: s ?? 200 }))
  return {
    json: jsonFn,
    _json: jsonFn,
  } as unknown as Parameters<typeof mapErrorToResponse>[1]
}

describe('mapErrorToResponse', () => {
  it('maps NotFoundError to a 404 json response', () => {
    const c = makeContext()
    const err = new NotFoundError('Recurso no encontrado')

    const result = mapErrorToResponse(err, c)

    expect(result).not.toBeNull()
    expect(c.json).toHaveBeenCalledWith({ error: 'Recurso no encontrado' }, 404)
  })

  it('maps NotOwnedError to a 403 json response', () => {
    const c = makeContext()

    const err = new NotOwnedError('Acceso denegado')

    const result = mapErrorToResponse(err, c)

    expect(result).not.toBeNull()
    expect(c.json).toHaveBeenCalledWith({ error: 'Acceso denegado' }, 403)
  })

  it('returns null for non-DomainError errors', () => {
    const c = makeContext()
    const err = new Error('Unexpected DB failure')

    const result = mapErrorToResponse(err, c)

    expect(result).toBeNull()
    expect(c.json).not.toHaveBeenCalled()
  })

  it('returns null for non-Error values', () => {
    const c = makeContext()

    const result = mapErrorToResponse('some string error', c)

    expect(result).toBeNull()
  })

  it('uses DomainError status and message for any DomainError subclass', () => {
    class CustomDomainError extends DomainError {
      readonly code = 'CUSTOM'
      readonly status = 409
      constructor() {
        super('Conflicto de recurso')
      }
    }
    const c = makeContext()
    const err = new CustomDomainError()

    mapErrorToResponse(err, c)

    expect(c.json).toHaveBeenCalledWith({ error: 'Conflicto de recurso' }, 409)
  })

  it('maps malformed JSON bodies to a Spanish 400', () => {
    const c = makeContext()
    mapErrorToResponse(new HTTPException(400, { message: 'Malformed JSON in request body' }), c)
    expect(c.json).toHaveBeenCalledWith({ error: 'El cuerpo de la solicitud no es un JSON válido' }, 400)
  })

  it('maps a wrapped unique violation on the account name to a 409', () => {
    const c = makeContext()
    const err = Object.assign(new Error('Failed query'), {
      cause: { code: '23505', constraint_name: 'financial_account_user_name_idx' },
    })
    mapErrorToResponse(err, c)
    expect(c.json).toHaveBeenCalledWith({ error: 'Ya tienes una cuenta con ese nombre' }, 409)
  })
})
