import { afterAll, describe, expect, it, vi } from 'vitest'

/**
 * Native clients (the iOS app) authenticate with a bearer token instead of the
 * cookie. Opt-in like the other integration tests:
 *
 *   TEST_DATABASE_URL=postgres://… pnpm --filter @finance-tdah/api test
 */
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL

vi.mock('./env', () => ({
  env: {
    DATABASE_URL: process.env.TEST_DATABASE_URL ?? 'postgres://unused',
    RESEND_API_KEY: undefined,
    RESEND_FROM_EMAIL: 'onboarding@resend.dev',
    BETTER_AUTH_URL: 'http://localhost:3001',
    BETTER_AUTH_SECRET: 'x'.repeat(32),
    WEB_ORIGIN: 'http://localhost:5173',
    NODE_ENV: 'test',
    ALLOWED_EMAILS: ['bearer@test.local'],
  },
  features: { passwordResetEmail: false, webPush: false },
}))

describe.skipIf(!TEST_DATABASE_URL)('bearer token sign-in (Postgres)', async () => {
  const { auth } = await import('./auth')
  const { db, schema } = await import('./db/client')
  const { eq } = await import('drizzle-orm')

  const email = 'bearer@test.local'
  const password = 'correct-horse-battery'
  // No Origin header: that is how a native URLSession request arrives.
  const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
    auth.handler(
      new Request(`http://localhost:3001/api/auth/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'cf-connecting-ip': '203.0.113.50', ...headers },
        body: JSON.stringify(body),
      }),
    )

  afterAll(async () => {
    await db.delete(schema.user).where(eq(schema.user.email, email))
  })

  it('returns a token on sign-in that getSession accepts as Authorization: Bearer', async () => {
    expect((await post('sign-up/email', { email, password, name: 'Bearer' })).status).toBe(200)
    const res = await post('sign-in/email', { email, password })
    expect(res.status).toBe(200)

    const token = res.headers.get('set-auth-token')
    expect(token).toBeTruthy()

    const session = await auth.api.getSession({ headers: new Headers({ authorization: `Bearer ${token}` }) })
    expect(session?.user.email).toBe(email)
  })

  it('rejects a garbage bearer token', async () => {
    const session = await auth.api.getSession({ headers: new Headers({ authorization: 'Bearer nope' }) })
    expect(session).toBeNull()
  })
})
