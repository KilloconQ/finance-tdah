import { describe, expect, it } from 'vitest'
import { authErrorMessage, thrownErrorMessage } from './auth-errors'

const FALLBACK = 'No pudimos entrar.'

describe('authErrorMessage', () => {
  it('returns the fallback when there is no error', () => {
    expect(authErrorMessage(null, FALLBACK)).toBe(FALLBACK)
    expect(authErrorMessage(undefined, FALLBACK)).toBe(FALLBACK)
  })

  it('treats a missing or zero status as the API being unreachable', () => {
    expect(authErrorMessage({}, FALLBACK)).toMatch(/No pudimos conectar/)
    expect(authErrorMessage({ status: 0, message: 'x' }, FALLBACK)).toMatch(/No pudimos conectar/)
  })

  it('explains a 429 as too many attempts', () => {
    expect(authErrorMessage({ status: 429, message: 'Too many requests' }, FALLBACK)).toMatch(
      /Demasiados intentos/,
    )
  })

  it('translates known better-auth codes', () => {
    expect(authErrorMessage({ status: 401, code: 'INVALID_EMAIL_OR_PASSWORD' }, FALLBACK)).toBe(
      'Email o contraseña incorrectos.',
    )
    expect(authErrorMessage({ status: 422, code: 'USER_ALREADY_EXISTS' }, FALLBACK)).toBe(
      'Ya existe una cuenta con ese email.',
    )
  })

  it('prefers a known code over the generic 5xx message', () => {
    expect(authErrorMessage({ status: 503, code: 'PASSWORD_RESET_UNAVAILABLE' }, FALLBACK)).toMatch(
      /reset por email no está configurado/,
    )
  })

  it('says the server is down for a bare 5xx, with the status', () => {
    const msg = authErrorMessage({ status: 502, message: 'Bad Gateway' }, FALLBACK)
    expect(msg).toMatch(/El servidor no está respondiendo/)
    expect(msg).toContain('502')
  })

  it("passes through a 5xx message that came from the API's own error handler", () => {
    expect(authErrorMessage({ status: 500, code: 'SOMETHING', message: 'Algo específico' }, FALLBACK)).toBe(
      'Algo específico',
    )
  })

  it('falls back to "wrong credentials" for a 401/403 without a message', () => {
    expect(authErrorMessage({ status: 401 }, FALLBACK)).toBe('Email o contraseña incorrectos.')
    expect(authErrorMessage({ status: 403, message: 'Email no verificado' }, FALLBACK)).toBe(
      'Email no verificado',
    )
  })

  it('uses the message, then the fallback, for other statuses', () => {
    expect(authErrorMessage({ status: 400, message: 'Datos inválidos' }, FALLBACK)).toBe('Datos inválidos')
    expect(authErrorMessage({ status: 400 }, FALLBACK)).toBe(FALLBACK)
  })
})

describe('thrownErrorMessage', () => {
  it('reads a TypeError (failed fetch) as being offline', () => {
    expect(thrownErrorMessage(new TypeError('Failed to fetch'))).toMatch(/No pudimos conectar/)
  })

  it("uses an Error's message, or the fallback when it is empty", () => {
    expect(thrownErrorMessage(new Error('boom'))).toBe('boom')
    expect(thrownErrorMessage(new Error(''), 'fallback')).toBe('fallback')
  })

  it('returns the fallback for non-errors', () => {
    expect(thrownErrorMessage('nope')).toBe('Error inesperado')
    expect(thrownErrorMessage(null, 'otro')).toBe('otro')
  })
})
