import { betterAuth } from 'better-auth'
import { APIError } from 'better-auth/api'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { db } from './db/client'
import { env } from './env'

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
  }),
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: [env.WEB_ORIGIN],
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 días
    updateAge: 60 * 60 * 24, // refresca cada día
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 min
    },
  },
  advanced: {
    cookiePrefix: 'finance-tdah',
    // Make the cookie hardening explicit instead of relying on better-auth defaults.
    // sameSite 'lax' already blocks the cookie on cross-site state-changing requests
    // (POST/PATCH/DELETE), which is every mutating endpoint here; 'strict' would only
    // add protection against cross-site top-level GETs (none mutate) at a real UX cost.
    defaultCookieAttributes: {
      httpOnly: true,
      sameSite: 'lax',
      secure: env.NODE_ENV === 'production',
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const allowlist = env.ALLOWED_EMAILS
          if (allowlist.length > 0 && !allowlist.includes(user.email.toLowerCase())) {
            throw new APIError('FORBIDDEN', {
              message: 'Este email no está habilitado para registrarse.',
            })
          }
          return { data: user }
        },
      },
    },
  },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 60,
    customRules: {
      '/sign-in/email': { window: 60, max: 5 },
      '/sign-up/email': { window: 60, max: 5 },
      '/forget-password': { window: 60, max: 3 },
    },
  },
})

export type Auth = typeof auth
