import { afterEach, describe, expect, it, vi } from 'vitest'

const BASE_ENV = {
  DATABASE_URL: 'postgres://user:pass@localhost:5432/db',
  BETTER_AUTH_SECRET: 'x'.repeat(32),
  BETTER_AUTH_URL: 'http://localhost:3001',
  WEB_ORIGIN: 'http://localhost:5173',
}

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
      VAPID_PUBLIC_KEY: 'pub',
      VAPID_PRIVATE_KEY: 'priv',
    })

    expect(features.passwordResetEmail).toBe(true)
    expect(features.webPush).toBe(true)
  })
})
