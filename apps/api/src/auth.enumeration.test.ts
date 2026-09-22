import { describe, expect, it, vi } from 'vitest'

// Boots auth.ts with Resend unconfigured — the state that used to make the reset
// form answer differently for a registered vs unknown address.
vi.mock('./env', () => ({
  env: {
    RESEND_API_KEY: undefined,
    RESEND_FROM_EMAIL: 'onboarding@resend.dev',
    BETTER_AUTH_URL: 'http://localhost:3001',
    BETTER_AUTH_SECRET: 'x'.repeat(32),
    WEB_ORIGIN: 'http://localhost:5173',
    NODE_ENV: 'test',
    ALLOWED_EMAILS: [],
  },
  features: { passwordResetEmail: false, webPush: false },
}))

vi.mock('./db/client', () => ({ db: {}, schema: {} }))

const { auth, isPasswordResetPath, PASSWORD_RESET_UNAVAILABLE } = await import('./auth')

describe('password reset when Resend is unconfigured', () => {
  it('matches the endpoint better-auth actually routes', () => {
    // Renamed in better-auth 1.6 — the web calls authClient.requestPasswordReset().
    expect(isPasswordResetPath('/request-password-reset')).toBe(true)
    expect(isPasswordResetPath('/forget-password')).toBe(true)
    expect(isPasswordResetPath('/sign-in/email')).toBe(false)
  })

  it('rejects identically for a registered and an unknown address', async () => {
    // The db mock has no user table at all: if the handler got far enough to look
    // an address up it would blow up differently per address. Both must be the
    // same 503 from the before-hook, which runs ahead of any lookup.
    const call = (email: string) =>
      auth.handler(
        new Request('http://localhost:3001/api/auth/request-password-reset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, redirectTo: '/auth/reset-password' }),
        }),
      )

    const [known, unknown] = await Promise.all([
      call('registrado@ejemplo.com'),
      call('no-existe@ejemplo.com'),
    ])

    expect(known.status).toBe(503)
    expect(unknown.status).toBe(503)

    const knownBody = (await known.json()) as { code?: string }
    // The code proves the before-hook answered rather than a lookup failing: the
    // db mock is empty, so anything that reached it would fail some other way.
    expect(knownBody.code).toBe(PASSWORD_RESET_UNAVAILABLE)
    expect(await unknown.json()).toEqual(knownBody)
  })

  it('never throws out of sendResetPassword, which only runs for real users', async () => {
    const sendResetPassword = (auth.options.emailAndPassword as { sendResetPassword?: Function })
      .sendResetPassword
    await expect(
      sendResetPassword?.({ user: { email: 'registrado@ejemplo.com' }, url: 'https://x/reset' }),
    ).resolves.toBeUndefined()
  })
})
