import { describe, expect, it } from 'vitest'
import { pushKeyError } from './use-push-subscription'

// A throwaway pair generated with web-push for tests; it signs nothing.
const PUBLIC = 'BNtbUuH5yBFTn_WD2cARgHQKXaMcx1ElLV-pP3GZKIOR87Mg28GKCfEnSpPB-b6mx75mQumNqvmJDtZlR0cJQmk'
const PRIVATE = 'Pmhk7qxWdOEXXNtn-0vo3NPfTqluCNjX8yQfDrnXuo4'

describe('pushKeyError', () => {
  it('has nothing to say about a missing key (the toggle is hidden then) or a good one', () => {
    expect(pushKeyError(undefined)).toBeNull()
    expect(pushKeyError('')).toBeNull()
    expect(pushKeyError(PUBLIC)).toBeNull()
  })

  it('explains a key the browser would reject, in plain Spanish', () => {
    for (const bad of [PRIVATE, `"${PUBLIC}"`, PUBLIC.slice(0, 60)]) {
      expect(pushKeyError(bad)).toMatch(/no es válida.*VAPID_PUBLIC_KEY/)
    }
  })
})
