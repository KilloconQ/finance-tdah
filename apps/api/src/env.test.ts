import { afterEach, describe, expect, it, vi } from 'vitest'
import webpush from 'web-push'

const BASE_ENV = {
  DATABASE_URL: 'postgres://user:pass@localhost:5432/db',
  BETTER_AUTH_SECRET: 'x'.repeat(32),
  BETTER_AUTH_URL: 'http://localhost:3001',
  WEB_ORIGIN: 'http://localhost:5173',
}

const VAPID = webpush.generateVAPIDKeys()

async function loadEnv(overrides: Record<string, string>) {
  vi.resetModules()
  vi.stubEnv('NODE_ENV', 'test')
  for (const [key, value] of Object.entries({ ...BASE_ENV, ...overrides })) {
    vi.stubEnv(key, value)
  }
  return import('./env')
}

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('env', () => {
  it('boots without the optional feature credentials', async () => {
    // Regression: these used to be required, so a compose file that did not pass
    // them made the api exit(1) on startup and nobody could sign in.
    const exit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never)

    const { features } = await loadEnv({})

    expect(exit).not.toHaveBeenCalled()
    expect(features.passwordResetEmail).toBe(false)
    expect(features.webPush).toBe(false)
    exit.mockRestore()
  })

  it('treats blank values (docker compose ${VAR:-}) as unconfigured', async () => {
    const { env, features } = await loadEnv({
      RESEND_API_KEY: '   ',
      VAPID_PUBLIC_KEY: '',
      VAPID_PRIVATE_KEY: '',
    })

    expect(env.RESEND_API_KEY).toBeUndefined()
    expect(features.passwordResetEmail).toBe(false)
    expect(features.webPush).toBe(false)
  })

  it('enables each feature once its credentials are present', async () => {
    const { features } = await loadEnv({
      RESEND_API_KEY: 're_test_key',
      VAPID_PUBLIC_KEY: VAPID.publicKey,
      VAPID_PRIVATE_KEY: VAPID.privateKey,
    })

    expect(features.passwordResetEmail).toBe(true)
    expect(features.webPush).toBe(true)
    expect(features.webPushProblem).toBeNull()
  })

  it('leaves push off, without exiting, when the VAPID keys are malformed', async () => {
    // Regression: a .env with the private key on the VAPID_PUBLIC_KEY line made
    // `web-push` throw while the API loaded, taking sign-in down with it.
    const exit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never)

    const { features } = await loadEnv({
      VAPID_PUBLIC_KEY: VAPID.privateKey,
      VAPID_PRIVATE_KEY: VAPID.privateKey,
    })

    expect(exit).not.toHaveBeenCalled()
    expect(features.webPush).toBe(false)
    expect(features.webPushProblem).toMatch(/VAPID_PUBLIC_KEY is not a valid public key/)
    exit.mockRestore()
  })

  it('says which VAPID key is missing when only one is set', async () => {
    const { features } = await loadEnv({ VAPID_PUBLIC_KEY: VAPID.publicKey })

    expect(features.webPush).toBe(false)
    expect(features.webPushProblem).toMatch(/VAPID_PRIVATE_KEY is not set/)
  })
})
