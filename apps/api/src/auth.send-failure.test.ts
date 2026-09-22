import { describe, expect, it, vi } from 'vitest'

// Resend IS configured here — the oracle this guards against only exists when
// the provider is reachable enough to be configured but fails on send.
const { send } = vi.hoisted(() => ({ send: vi.fn() }))

vi.mock('resend', () => ({
  Resend: class {
    emails = { send }
  },
}))

vi.mock('./env', () => ({
  env: {
    RESEND_API_KEY: 're_test_key',
    RESEND_FROM_EMAIL: 'onboarding@resend.dev',
    BETTER_AUTH_URL: 'http://localhost:3001',
    BETTER_AUTH_SECRET: 'x'.repeat(32),
    WEB_ORIGIN: 'http://localhost:5173',
    NODE_ENV: 'test',
    ALLOWED_EMAILS: [],
  },
  features: { passwordResetEmail: true, webPush: false },
}))

vi.mock('./db/client', () => ({ db: {}, schema: {} }))

const { auth } = await import('./auth')

type ResetArgs = { user: { email: string }; url: string }

/**
 * Cast through unknown: better-auth's real signature wants a full user row plus
 * a token, none of which this callback reads. The test only needs the branch
 * that decides whether a send failure escapes.
 */
function sendResetPassword(): (args: ResetArgs) => Promise<void> {
  const handler = (auth.options.emailAndPassword as unknown as {
    sendResetPassword?: (args: ResetArgs) => Promise<void>
  }).sendResetPassword
  expect(handler).toBeTypeOf('function')
  return handler!
}

describe('sendResetPassword when Resend fails', () => {
  it('resolves instead of rejecting, so a registered address cannot be told apart', async () => {
    // Rejecting here used to propagate a 5xx — but only for addresses that
    // exist, since better-auth never reaches this callback for the others.
    send.mockRejectedValueOnce(new Error('resend is down'))

    await expect(
      sendResetPassword()({ user: { email: 'registrado@ejemplo.com' }, url: 'https://x/reset' }),
    ).resolves.toBeUndefined()

    expect(send).toHaveBeenCalledTimes(1)
  })

  it('still sends when the provider is healthy', async () => {
    send.mockResolvedValueOnce({ id: 'email-1' })

    await sendResetPassword()({ user: { email: 'registrado@ejemplo.com' }, url: 'https://x/reset' })

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'registrado@ejemplo.com', from: 'onboarding@resend.dev' }),
    )
  })
})
