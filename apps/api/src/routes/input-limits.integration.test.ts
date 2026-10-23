import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { Hono } from 'hono'

/** Opt-in like the other integration tests: needs TEST_DATABASE_URL (throwaway DB). */
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL

vi.mock('../env', () => ({
  env: { DATABASE_URL: process.env.TEST_DATABASE_URL ?? 'postgres://unused', NODE_ENV: 'test' },
  features: { passwordResetEmail: false, webPush: false },
}))

vi.mock('../middleware/session', () => ({
  sessionMiddleware: async (
    c: { req: { header: (k: string) => string | undefined }; set: (k: string, v: unknown) => void },
    next: () => Promise<void>,
  ) => {
    c.set('user', { id: c.req.header('x-test-user') })
    await next()
  },
}))

describe.skipIf(!TEST_DATABASE_URL)('input limits (Postgres)', async () => {
  const { db, schema } = await import('../db/client')
  const { accountsRoute } = await import('./accounts')
  const { mapErrorToResponse } = await import('../shared/http/error-mapper')
  const { eq } = await import('drizzle-orm')

  const app = new Hono().route('/accounts', accountsRoute)
  app.onError((err, c) => mapErrorToResponse(err, c) ?? c.json({ error: 'boom' }, 500))
  const USER = `limits${Date.now()}`

  beforeAll(async () => {
    await db.insert(schema.user).values({ id: USER, name: 'Limits', email: `${USER}@test.local` })
  })
  afterAll(async () => {
    await db.delete(schema.user).where(eq(schema.user.id, USER))
  })

  const post = (body: string) =>
    app.request('/accounts', {
      method: 'POST',
      headers: { 'x-test-user': USER, 'Content-Type': 'application/json' },
      body,
    })

  it('rejects an amount above int32 with 400 instead of 500', async () => {
    const res = await post(JSON.stringify({ name: 'Grande', type: 'debito', balanceCents: 2_147_483_648 }))
    expect(res.status).toBe(400)
  })

  it('answers malformed JSON with 400', async () => {
    const res = await post('{not json')
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'El cuerpo de la solicitud no es un JSON válido' })
  })

  it('answers a duplicate account name with 409', async () => {
    const body = JSON.stringify({ name: 'Nómina', type: 'debito', balanceCents: 0 })
    expect((await post(body)).status).toBe(201)
    const dup = await post(body)
    expect(dup.status).toBe(409)
    expect(await dup.json()).toEqual({ error: 'Ya tienes una cuenta con ese nombre' })
  })
})
