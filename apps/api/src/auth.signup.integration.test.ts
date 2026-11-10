import { afterAll, describe, expect, it, vi } from 'vitest'

/**
 * Invite-only registration on a real, migrated Postgres (opt-in like the other
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

describe.skipIf(!TEST_DATABASE_URL)('sign-up is invite-only (Postgres)', async () => {
  const { auth } = await import('./auth')
  const { db, schema } = await import('./db/client')
  const { eq, like } = await import('drizzle-orm')

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
  const invite = (email: string, ageDays = 0) =>
    db.insert(schema.signupInvite).values({ email, createdAt: new Date(Date.now() - ageDays * 86_400_000) })

  afterAll(async () => {
    await db.delete(schema.user).where(like(schema.user.email, `%-${run}@%`))
    await db.delete(schema.user).where(eq(schema.user.email, 'admin-signup@test.local'))
    await db.delete(schema.signupInvite).where(like(schema.signupInvite.email, `%-${run}@%`))
  })

  it('rejects an address nobody invited', async () => {
    expect((await signUp(addr('intruso'))).status).toBe(403)
    expect(await db.query.user.findFirst({ where: (u, { eq }) => eq(u.email, addr('intruso')) })).toBeUndefined()
  })

  it('accepts an invited address once, whatever the casing, and the invite is spent', async () => {
    await invite(addr('invitada'))
    expect((await signUp(addr('Invitada'))).status).toBe(200)
    expect(await db.query.signupInvite.findFirst({ where: (i, { eq }) => eq(i.email, addr('invitada')) })).toBeUndefined()
  })

  it('rejects an invitation older than 7 days', async () => {
    await invite(addr('vieja'), 8)
    expect((await signUp(addr('vieja'))).status).toBe(403)
  })

  it('lets an ALLOWED_EMAILS address register without an invite', async () => {
    expect((await signUp('admin-signup@test.local')).status).toBe(200)
  })
})
