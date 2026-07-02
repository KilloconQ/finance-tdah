import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  DATABASE_URL: z.url(),
  BETTER_AUTH_SECRET: z.string().min(32, {
    error: 'BETTER_AUTH_SECRET tiene que tener al menos 32 chars',
  }),
  BETTER_AUTH_URL: z.url(),
  WEB_ORIGIN: z.url(),
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
