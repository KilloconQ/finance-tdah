import { env } from '../env'
import { deliver } from './mailer'

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (ch) => ESCAPES[ch])

/**
 * Tells an existing account that someone invited them to a group. The caller
 * answers the same whether or not the address has an account, so a delivery
 * problem must not turn into an error for only one of the two.
 */
export function sendGroupInvitationEmail(input: { to: string; inviterName: string; groupName: string }): Promise<void> {
  const link = `${env.WEB_ORIGIN}/groups`
  return deliver('group_invitation_email', {
    to: input.to,
    subject: `${input.inviterName} te invitó a un grupo en Cada Quien`,
    html: `<p>${escapeHtml(input.inviterName)} te invitó al grupo «${escapeHtml(input.groupName)}» en Cada Quien.</p><p>Abre la app para aceptar o declinar la invitación:</p><p><a href="${link}">${link}</a></p>`,
  })
}

/** Invites an address with no account to sign up for Cada Quien. */
export function sendAppInvitationEmail(input: { to: string; inviterName: string }): Promise<void> {
  const link = `${env.WEB_ORIGIN}/auth/sign-up`
  return deliver('app_invitation_email', {
    to: input.to,
    subject: `${input.inviterName} te invitó a Cada Quien`,
    html: `<p>${escapeHtml(input.inviterName)} te invitó a usar Cada Quien, una app para llevar tus gastos y dividirlos con otras personas.</p><p>Crea tu cuenta aquí:</p><p><a href="${link}">${link}</a></p>`,
  })
}
