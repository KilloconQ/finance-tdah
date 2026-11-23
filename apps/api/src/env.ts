import { z } from 'zod'
import { apnsStatus } from './lib/apns'
import { vapidStatus } from './lib/vapid'

// docker compose passes unset vars through as empty strings (`${FOO:-}`), so an
// absent credential arrives as '' rather than undefined. Normalize both to undefined.
const optionalSecret = z
  .string()
  .optional()
  .transform((v) => {
    const trimmed = v?.trim()
    return trimmed ? trimmed : undefined
  })

const emailList = z
  .string()
  .optional()
  .default('')
  .transform((s) =>
    s
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  )

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
  // Native (iPhone) push through APNs. All optional, like web push: without them the iOS app still works and just
  // gets no notifications. APNS_PRIVATE_KEY is the contents of the .p8 file from Apple.
  APNS_KEY_ID: optionalSecret,
  APNS_TEAM_ID: optionalSecret,
  APNS_BUNDLE_ID: z.string().trim().min(1).default('app.cadaquien.ios'),
  APNS_PRIVATE_KEY: optionalSecret,
  // Comma-separated emails that never pay (free for now). Registration is open to everyone.
  ALLOWED_EMAILS: emailList,
  // Comma-separated emails that may open /api/admin.
  ADMIN_EMAILS: emailList,
  // RevenueCat: the secret RevenueCat sends in the Authorization header of its webhook, and the
  // entitlement that unlocks the app. Billing is enforced only in production AND with the secret set,
  // so dev/local never shows a paywall (see `features.billing`).
  REVENUECAT_WEBHOOK_AUTH: optionalSecret,
  REVENUECAT_ENTITLEMENT_ID: z.string().trim().min(1).default('pro'),
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

const webPush = vapidStatus(env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY)
const apns = apnsStatus({
  keyId: env.APNS_KEY_ID,
  teamId: env.APNS_TEAM_ID,
  bundleId: env.APNS_BUNDLE_ID,
  privateKey: env.APNS_PRIVATE_KEY,
})

export const features = {
  // Paywall + 402s. Off in dev/test and whenever the webhook secret is missing (a prod misconfig is logged at startup).
  billing: env.NODE_ENV === 'production' && Boolean(env.REVENUECAT_WEBHOOK_AUTH),
  passwordResetEmail: Boolean(env.RESEND_API_KEY),
  // On only for a usable pair: a malformed one would make `web-push` throw while
  // the API loads. `webPushProblem` says why it's off, for the startup log.
  webPush: webPush.enabled,
  webPushProblem: webPush.enabled ? null : webPush.problem,
  // Native push: on only for a usable key, like web push.
  apns: apns.enabled,
  apnsProblem: apns.enabled ? null : apns.problem,
  // True when someone started setting APNs up: a half-done setup is worth a startup warning, an unset one is not.
  apnsConfigured: apns.enabled || apns.configured,
} as const
