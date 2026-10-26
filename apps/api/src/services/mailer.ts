import { Resend } from 'resend'
import { env } from '../env'
import { logger } from '../lib/logger'

// Email is optional: without a Resend key nothing is sent, and sign-in and the rest of the API keep working.
const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null

export const emailEnabled = resend !== null

/** Sends one email. Never throws: a delivery problem is logged as `event`, so the request that triggered it is unaffected. */
export async function deliver(event: string, message: { to: string; subject: string; html: string }): Promise<void> {
  if (!resend) {
    logger.warn(`${event}_skipped`, { message: 'RESEND_API_KEY no está configurada — no se envió el correo' })
    return
  }
  try {
    // Resend reports API failures (e.g. an unverified recipient on the sandbox sender) in `error` instead of throwing.
    const { error } = await resend.emails.send({ from: env.RESEND_FROM_EMAIL, ...message })
    if (error) logger.error(`${event}_failed`, { message: error.message })
  } catch (err) {
    logger.error(`${event}_failed`, { message: err instanceof Error ? err.message : String(err) })
  }
}
