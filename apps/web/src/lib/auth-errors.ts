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
  INVALID_EMAIL_OR_PASSWORD: 'Correo o contraseña incorrectos.',
  INVALID_PASSWORD: 'Correo o contraseña incorrectos.',
  USER_NOT_FOUND: 'Correo o contraseña incorrectos.',
  USER_ALREADY_EXISTS: 'Ya existe una cuenta con ese correo. Inicia sesión o usa otro.',
  PASSWORD_TOO_SHORT: 'La contraseña tiene que tener al menos 8 caracteres.',
  PASSWORD_TOO_LONG: 'La contraseña es demasiado larga.',
  INVALID_TOKEN: 'El enlace venció o ya se usó. Pide uno nuevo.',
  PASSWORD_RESET_UNAVAILABLE: 'El restablecimiento por correo no está configurado. Contacta a quien administra la app.',
}

export const OFFLINE = 'No pudimos conectar con el servidor. Revisa tu conexión e intenta de nuevo.'
const SERVER_DOWN =
  'El servidor no está respondiendo. Si acaba de actualizarse, revisa que la API haya arrancado bien.'
const RATE_LIMITED = 'Demasiados intentos seguidos. Espera un minuto y prueba de nuevo.'

export function authErrorMessage(error: AuthErrorLike | null | undefined, fallback: string): string {
  if (!error) return fallback

  const status = error.status ?? 0
  // status 0 = the fetch itself never completed (API unreachable, DNS, offline).
  if (status === 0) return OFFLINE
  if (status === 429) return RATE_LIMITED

  // Checked before the generic 5xx branch: a healthy API answering 503 for a
  // disabled feature carries an actionable code, and that message beats
  // "el servidor no está respondiendo".
  if (error.code && CODE_MESSAGES[error.code]) return CODE_MESSAGES[error.code]

  // A crash-looping API behind a proxy answers 502/503/504 with no usable body —
  // no code means the body did not come from our own error handler.
  if (status >= 500) {
    return error.code && error.message ? error.message : `${SERVER_DOWN} (error ${status})`
  }

  if (status === 401 || status === 403) return error.message ? translateMessage(error.message) : CODE_MESSAGES.INVALID_EMAIL_OR_PASSWORD
  return error.message ? translateMessage(error.message) : fallback
}

/** Same idea for a thrown exception (better-auth rethrows network failures). */
export function thrownErrorMessage(err: unknown, fallback = 'Error inesperado'): string {
  if (err instanceof TypeError) return OFFLINE
  if (err instanceof Error) return err.message ? translateMessage(err.message) : fallback
  return fallback
}

export const TIMEOUT = 'Tarda más de lo normal. Revisa tu conexión e inténtalo de nuevo.'

const ENGLISH_MESSAGES: Array<[RegExp, string]> = [
  [/user already exists/i, CODE_MESSAGES.USER_ALREADY_EXISTS],
  [/invalid email or password/i, CODE_MESSAGES.INVALID_EMAIL_OR_PASSWORD],
  [/failed to fetch|networkerror|load failed|network request failed/i, OFFLINE],
  [/timed? ?out/i, TIMEOUT],
  [/internal server error|something went wrong/i, 'Algo salió mal de nuestro lado. Intenta de nuevo en un momento.'],
  [/^not found$/i, 'No encontramos lo que buscas. Vuelve al inicio e intenta de nuevo.'],
]

/** Calm Spanish copy for an HTTP status when the body carried nothing usable. */
export function statusMessage(status: number): string {
  if (status === 401) return 'Tu sesión venció. Inicia sesión de nuevo.'
  if (status === 403) return 'No tienes permiso para hacer eso.'
  if (status === 404) return 'No encontramos lo que buscas. Vuelve al inicio e intenta de nuevo.'
  if (status === 429) return RATE_LIMITED
  if (status >= 500) return 'Algo salió mal de nuestro lado. Intenta de nuevo en un momento.'
  return 'Revisa los datos e intenta de nuevo.'
}

/** Maps a known raw English message to Spanish; returns the input when it is not recognised. */
export function translateMessage(message: string): string {
  for (const [re, es] of ENGLISH_MESSAGES) if (re.test(message)) return es
  return message
}
