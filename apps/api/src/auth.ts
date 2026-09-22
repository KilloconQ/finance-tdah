import { betterAuth } from 'better-auth'
import { APIError } from 'better-auth/api'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { Resend } from 'resend'
import { db } from './db/client'
import { env } from './env'
import { logger } from './lib/logger'

// Password-reset email is an optional feature: without a Resend key the reset
// endpoint fails loudly, but sign-in/sign-up keep working.
const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null

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
    sendResetPassword: async ({ user, url }) => {
      if (!resend) {
        logger.error('password_reset_unavailable', {
          message: 'RESEND_API_KEY no está configurada — no se pudo enviar el email de reset',
        })
        throw new APIError('SERVICE_UNAVAILABLE', {
          message: 'El envío de emails no está configurado. Contactá al admin.',
        })
      }
      await resend.emails.send({
        from: env.RESEND_FROM_EMAIL,
        to: user.email,
        subject: 'Restablecé tu contraseña',
        html: `<p>Hacé click para restablecer tu contraseña de Cada Quien:</p><p><a href="${url}">${url}</a></p><p>Si no pediste esto, ignorá este email.</p>`,
      })
    },
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
