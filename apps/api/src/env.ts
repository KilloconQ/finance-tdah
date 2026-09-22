import { z } from 'zod'

// docker compose passes unset vars through as empty strings (`${FOO:-}`), so an
// absent credential arrives as '' rather than undefined. Normalize both to undefined.
const optionalSecret = z
  .string()
  .optional()
  .transform((v) => {
    const trimmed = v?.trim()
    return trimmed ? trimmed : undefined
  })

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  DATABASE_URL: z.url(),
  BETTER_AUTH_SECRET: z.string().min(32, {
    error: 'BETTER_AUTH_SECRET tiene que tener al menos 32 chars',
  }),
  BETTER_AUTH_URL: z.url(),
  WEB_ORIGIN: z.url(),
  // Optional feature credentials. These gate password-reset emails and web push,
  // NOT authentication: a missing key must never take the whole API down and lock
  // everyone out of sign-in. Missing/blank normalizes to undefined and the feature
  // degrades with a clear error (see auth.ts / services/push-sender.ts).
  RESEND_API_KEY: optionalSecret,
  RESEND_FROM_EMAIL: z.string().default('onboarding@resend.dev'),
  VAPID_PUBLIC_KEY: optionalSecret,
  VAPID_PRIVATE_KEY: optionalSecret,
  VAPID_SUBJECT: z.string().default('mailto:soporte@finance-tdah.local'),
  // Comma-separated allowlist of emails permitted to register. When empty, sign-up
  // is open to anyone (a warning is logged at startup). Set it to lock registration
  // down to the known users.
  ALLOWED_EMAILS: z
    .string()
    .optional()
    .default('')
    .transform((s) =>
      s
        .split(',')
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean),
    ),
})

const parsed = envSchema.safeParse(process.env)
if (!parsed.success) {
  console.error('❌ Invalid environment variables:')
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`)
  }
  process.exit(1)
}

export const env = parsed.data
export type Env = typeof env

export const features = {
  passwordResetEmail: Boolean(env.RESEND_API_KEY),
  webPush: Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY),
} as const
