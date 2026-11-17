import { describe, expect, it } from 'vitest'
import { redactPath } from './redact-path'

describe('redactPath', () => {
  it('hides the password reset token that travels in the path', () => {
    expect(redactPath('/api/auth/reset-password/abc123TOKEN')).toBe('/api/auth/reset-password/[redacted]')
  })

  it('hides it however the path is cased, slashed or encoded', () => {
    expect(redactPath('/api/auth/Reset-Password/abc')).toBe('/api/auth/Reset-Password/[redacted]')
    expect(redactPath('/api/auth/reset-password/abc/')).toBe('/api/auth/reset-password/[redacted]')
    expect(redactPath('/api/auth/reset-password/a%2Fb%20c')).toBe('/api/auth/reset-password/[redacted]')
  })

  it('leaves every other path, including the reset request, untouched', () => {
    for (const path of [
      '/api/auth/request-password-reset',
      '/api/auth/reset-password',
      '/api/accounts/11111111-1111-4111-8111-111111111111/statement',
      '/health',
    ]) {
      expect(redactPath(path)).toBe(path)
    }
  })
})
