import { afterAll, describe, expect, it, vi } from 'vitest'

/**
 * Open registration on a real, migrated Postgres (opt-in like the other
 * integration tests):
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
    ALLOWED_EMAILS: ['admin-signup@test.local'],
  },
  features: { passwordResetEmail: false, webPush: false },
}))

describe.skipIf(!TEST_DATABASE_URL)('sign-up is open to anyone (Postgres)', async () => {
  const { auth } = await import('./auth')
  const { db, schema } = await import('./db/client')
  const { like } = await import('drizzle-orm')

  const run = crypto.randomUUID().slice(0, 8)
  const addr = (name: string) => `${name}-${run}@test.local`
  let ip = 0
  const signUp = (email: string) =>
    auth.handler(
      new Request('http://localhost:3001/api/auth/sign-up/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:5173', 'cf-connecting-ip': `203.0.113.${++ip}` },
        body: JSON.stringify({ email, password: 'correct-horse-battery', name: 'Test' }),
      }),
    )

  afterAll(async () => {
    await db.delete(schema.user).where(like(schema.user.email, `%-${run}@%`))
  })

  it('registers an address nobody invited', async () => {
    expect((await signUp(addr('cualquiera'))).status).toBe(200)
    expect(await db.query.user.findFirst({ where: (u, { eq }) => eq(u.email, addr('cualquiera')) })).toBeDefined()
  })
})
