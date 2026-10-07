/**
 * Shape checks for Web Push (VAPID) keys, shared by the API, which refuses to
 * start push with a bad pair, and the web, which says so instead of surfacing
 * the browser's "applicationServerKey is not valid".
 *
 * Both keys are base64url without padding: the public key is an uncompressed
 * P-256 point (65 bytes, 87 chars, always starting with the 0x04 marker, which
 * encodes as "B"), the private key a 32-byte scalar (43 chars). The usual
 * mistakes — the private key pasted on the public line, a stray quote, a
 * truncated paste — all break one of those facts.
 */

export const VAPID_PUBLIC_KEY_BYTES = 65
export const VAPID_PRIVATE_KEY_BYTES = 32

const BASE64URL = /^[A-Za-z0-9_-]+$/

/** Decoded size of an unpadded base64url string, or null if it can't be one. */
function decodedBytes(key: string): number | null {
  if (!BASE64URL.test(key) || key.length % 4 === 1) return null
  return Math.floor((key.length * 3) / 4)
}

export function isValidVapidPublicKey(key: string): boolean {
  return decodedBytes(key) === VAPID_PUBLIC_KEY_BYTES && key.startsWith('B')
}

export function isValidVapidPrivateKey(key: string): boolean {
  return decodedBytes(key) === VAPID_PRIVATE_KEY_BYTES
}
