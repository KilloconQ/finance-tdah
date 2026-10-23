import type { CSSProperties } from 'react'

/**
 * Deterministic tint for a subscription's initial avatar, derived from its name
 * so different services read as distinct (Apple TV+ ≠ Audible). Only the hue is
 * set here; `.avatar-tint` in index.css picks lightness per theme.
 */
export function avatarTint(name: string): CSSProperties {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  }
  return { '--avatar-hue': hash % 360 } as CSSProperties
}
