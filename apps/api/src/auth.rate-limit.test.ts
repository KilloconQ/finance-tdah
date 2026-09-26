import { describe, expect, it, vi } from 'vitest'

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

const { auth } = await import('./auth')

const getSession = (headers: Record<string, string>) =>
  auth.handler(new Request('http://localhost:3001/api/auth/get-session', { headers }))

const signIn = (headers: Record<string, string>) =>
  auth.handler(
    new Request('http://localhost:3001/api/auth/sign-in/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:5173', ...headers },
      body: JSON.stringify({ email: 'a@ejemplo.com', password: 'incorrecta' }),
    }),
  )

describe('auth rate limiting', () => {
  it('never rate-limits get-session, even for a whole household on one IP', async () => {
    // Well past the global 60/min: this is what used to log everyone out.
    for (let i = 0; i < 100; i++) {
      const res = await getSession({ 'x-forwarded-for': '203.0.113.7' })
      expect(res.status).not.toBe(429)
    }
  })

  it('keys sign-in attempts on cf-connecting-ip, not the shared proxy hop', async () => {
    const statuses = async (ip: string, n: number) => {
      const out: number[] = []
      for (let i = 0; i < n; i++) {
        out.push((await signIn({ 'cf-connecting-ip': ip, 'x-forwarded-for': '10.0.0.2' })).status)
      }
      return out
    }

    const first = await statuses('198.51.100.1', 11)
    expect(first.slice(0, 10)).not.toContain(429)
    expect(first[10]).toBe(429)

    // A different client behind the same proxy still has its own bucket.
    const [other] = await statuses('198.51.100.2', 1)
    expect(other).not.toBe(429)
  })
})
