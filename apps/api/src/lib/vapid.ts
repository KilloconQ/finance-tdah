import { createECDH } from 'node:crypto'
import {
  VAPID_PRIVATE_KEY_BYTES,
  VAPID_PUBLIC_KEY_BYTES,
  isValidVapidPrivateKey,
  isValidVapidPublicKey,
} from '@finance-tdah/shared/domain'

export type VapidStatus = { enabled: true } | { enabled: false; problem: string }

const hint = 'Check the .env for a duplicated, swapped, quoted or truncated line.'

/**
 * Whether a VAPID pair can sign pushes, and if not, why. `web-push` throws on a
 * malformed key when it is configured, and that happens while the API loads: a
 * typo in an optional feature would take sign-in down with it. So the pair is
 * checked first and a bad one just leaves push off, with the reason in the log.
 */
export function vapidStatus(publicKey: string | undefined, privateKey: string | undefined): VapidStatus {
  if (!publicKey && !privateKey) return { enabled: false, problem: 'VAPID keys are not set.' }
  if (!publicKey) return { enabled: false, problem: 'VAPID_PUBLIC_KEY is not set.' }
  if (!privateKey) return { enabled: false, problem: 'VAPID_PRIVATE_KEY is not set.' }

  if (!isValidVapidPublicKey(publicKey)) {
    return {
      enabled: false,
      problem: `VAPID_PUBLIC_KEY is not a valid public key (${publicKey.length} chars; expected 87 base64url chars, ${VAPID_PUBLIC_KEY_BYTES} bytes). ${hint}`,
    }
  }
  if (!isValidVapidPrivateKey(privateKey)) {
    return {
      enabled: false,
      problem: `VAPID_PRIVATE_KEY is not a valid private key (${privateKey.length} chars; expected 43 base64url chars, ${VAPID_PRIVATE_KEY_BYTES} bytes). ${hint}`,
    }
  }
  if (!isPair(publicKey, privateKey)) {
    return {
      enabled: false,
      problem: 'VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY are not a pair: the public key does not belong to the private one. Generate a new pair and set both.',
    }
  }
  return { enabled: true }
}

/** Pushes signed with a private key the browser's public key doesn't match are silently rejected. */
function isPair(publicKey: string, privateKey: string): boolean {
  try {
    const ecdh = createECDH('prime256v1')
    ecdh.setPrivateKey(Buffer.from(privateKey, 'base64url'))
    return ecdh.getPublicKey().toString('base64url') === publicKey
  } catch {
    return false
  }
}
