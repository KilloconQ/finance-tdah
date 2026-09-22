/**
 * Turns a better-auth client failure into copy that says what actually went wrong.
 *
 * The default `error.message ?? '<fallback>'` hid real outages: when the API is
 * down the client returns an error with no message, so a 502 and a wrong password
 * both showed the same "No pudimos entrar" and there was no way to tell them apart.
 */
export interface AuthErrorLike {
  code?: string
  message?: string
  status?: number
  statusText?: string
}

const CODE_MESSAGES: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: 'Email o contraseña incorrectos.',
  INVALID_PASSWORD: 'Email o contraseña incorrectos.',
  USER_NOT_FOUND: 'Email o contraseña incorrectos.',
  USER_ALREADY_EXISTS: 'Ya existe una cuenta con ese email.',
  PASSWORD_TOO_SHORT: 'La contraseña tiene que tener al menos 8 caracteres.',
  PASSWORD_TOO_LONG: 'La contraseña es demasiado larga.',
  INVALID_TOKEN: 'El link venció o ya se usó. Pedí uno nuevo.',
}

const OFFLINE = 'No pudimos conectar con el servidor. Revisá tu conexión e intentá de nuevo.'
const SERVER_DOWN =
  'El servidor no está respondiendo. Si acaba de actualizarse, revisá que la API haya arrancado bien.'
const RATE_LIMITED = 'Demasiados intentos seguidos. Esperá un minuto y probá de nuevo.'

export function authErrorMessage(error: AuthErrorLike | null | undefined, fallback: string): string {
  if (!error) return fallback

  const status = error.status ?? 0
  // status 0 = the fetch itself never completed (API unreachable, DNS, offline).
  if (status === 0) return OFFLINE
  if (status === 429) return RATE_LIMITED
  // A crash-looping API behind a proxy answers 502/503/504 with no usable body.
  if (status >= 500) return `${SERVER_DOWN} (error ${status})`

  if (error.code && CODE_MESSAGES[error.code]) return CODE_MESSAGES[error.code]
  if (status === 401 || status === 403) return error.message ?? CODE_MESSAGES.INVALID_EMAIL_OR_PASSWORD
  return error.message ?? fallback
}

/** Same idea for a thrown exception (better-auth rethrows network failures). */
export function thrownErrorMessage(err: unknown, fallback = 'Error inesperado'): string {
  if (err instanceof TypeError) return OFFLINE
  if (err instanceof Error) return err.message || fallback
  return fallback
}
