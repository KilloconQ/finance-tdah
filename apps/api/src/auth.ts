import { betterAuth } from 'better-auth'
import { APIError, createAuthMiddleware } from 'better-auth/api'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { Resend } from 'resend'
import { db } from './db/client'
import { env } from './env'
import { logger } from './lib/logger'

// Password-reset email is an optional feature: without a Resend key the reset
// endpoint fails loudly, but sign-in/sign-up keep working.
const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null

/**
 * better-auth renamed the endpoint to `/request-password-reset`; `/forget-password`
 * is kept here because the rate limiter still ships rules under the old name.
 */
const PASSWORD_RESET_PATHS = new Set(['/request-password-reset', '/forget-password'])

export function isPasswordResetPath(path: string): boolean {
  return PASSWORD_RESET_PATHS.has(path)
}

export const PASSWORD_RESET_UNAVAILABLE = 'PASSWORD_RESET_UNAVAILABLE'

/**
 * Rejects the reset request before better-auth looks the address up.
 *
 * `sendResetPassword` only runs once a user has been resolved, so failing in
 * there answers 503 for a registered address and the usual generic success for
 * an unknown one — an account-existence oracle. Refusing up front keeps the
 * response identical for every address.
 */
function requirePasswordResetConfigured(path: string): void {
  if (resend || !isPasswordResetPath(path)) return
  throw new APIError('SERVICE_UNAVAILABLE', {
    code: PASSWORD_RESET_UNAVAILABLE,
    message: 'El reset por email no está configurado. Contactá al admin.',
  })
}

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
    // This callback runs only once better-auth has resolved a user, so ANY way of
    // failing out of it answers differently for a registered address than for an
    // unknown one — an account-existence oracle. It always resolves; delivery
    // problems are a server-side concern and go to the log.
    sendResetPassword: async ({ user, url }) => {
      if (!resend) {
        // Unreachable: the before-hook rejects an unconfigured reset first.
        logger.error('password_reset_unavailable', {
          message: 'RESEND_API_KEY no está configurada — no se pudo enviar el email de reset',
        })
        return
      }
      try {
        await resend.emails.send({
          from: env.RESEND_FROM_EMAIL,
          to: user.email,
          subject: 'Restablecé tu contraseña',
          html: `<p>Hacé click para restablecer tu contraseña de Cada Quien:</p><p><a href="${url}">${url}</a></p><p>Si no pediste esto, ignorá este email.</p>`,
        })
      } catch (err) {
        // Resend being down would otherwise turn every registered address into a
        // 5xx while unknown ones keep getting the generic success.
        logger.error('password_reset_send_failed', {
          message: err instanceof Error ? err.message : String(err),
        })
      }
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
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      requirePasswordResetConfigured(ctx.path)
    }),
  },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 60,
    customRules: {
      '/sign-in/email': { window: 60, max: 5 },
      '/sign-up/email': { window: 60, max: 5 },
      // The endpoint is '/request-password-reset' since better-auth 1.6; the old
      // name stays so the rule still applies if the alias is ever routed again.
      '/request-password-reset': { window: 60, max: 3 },
      '/forget-password': { window: 60, max: 3 },
    },
  },
})

export type Auth = typeof auth
