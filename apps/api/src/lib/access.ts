import { eq } from 'drizzle-orm'
import { db, schema } from '../db/client'
import { env, features } from '../env'

/** Why a user may use the app: `free` = billing is off (dev), `none` = needs to subscribe. */
export type Access = 'free' | 'allowlist' | 'subscribed' | 'none'

export async function accessFor(user: { id: string; email: string }): Promise<Access> {
  if (!features.billing) return 'free'
  if (env.ALLOWED_EMAILS.includes(user.email.toLowerCase())) return 'allowlist'
  const row = await db.query.billingEntitlement.findFirst({ where: eq(schema.billingEntitlement.userId, user.id) })
  const live = row?.active && (!row.expiresAt || row.expiresAt > new Date())
  return live ? 'subscribed' : 'none'
}
