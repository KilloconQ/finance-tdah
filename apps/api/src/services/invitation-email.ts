import { env } from '../env'
import { emailLayout, escapeHtml } from './email-layout'
import { deliver } from './mailer'

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
    html: emailLayout({
      heading: `${input.inviterName} te invitó a un grupo`,
      body: `<p style="margin:0"><strong>${escapeHtml(input.inviterName)}</strong> te invitó al grupo «${escapeHtml(input.groupName)}» en Cada Quien. Abre la app para aceptar o declinar la invitación.</p>`,
      cta: { label: 'Ver invitación', url: link },
    }),
  })
}

/** Invites an address with no account to sign up for Cada Quien. */
export function sendAppInvitationEmail(input: { to: string; inviterName: string }): Promise<void> {
  const link = `${env.WEB_ORIGIN}/auth/sign-up`
  return deliver('app_invitation_email', {
    to: input.to,
    subject: `${input.inviterName} te invitó a Cada Quien`,
    html: emailLayout({
      heading: `${input.inviterName} te invitó a Cada Quien`,
      body: `<p style="margin:0"><strong>${escapeHtml(input.inviterName)}</strong> te invitó a usar Cada Quien, una app para llevar tus gastos y dividirlos con otras personas.</p>`,
      cta: { label: 'Crear mi cuenta', url: link },
    }),
  })
}
