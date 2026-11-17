/**
 * Request paths go into the logs, and the password reset link carries its one-time token in
 * the path (`/reset-password/<token>`), so anyone reading the logs within the hour it lives
 * could reset that account. Everything after `reset-password/` is hidden.
 */
export function redactPath(path: string): string {
  return path.replace(/(\/reset-password\/)[^?#]+/i, '$1[redacted]')
}
