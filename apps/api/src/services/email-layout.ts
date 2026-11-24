import { env } from '../env'

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
export const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (ch) => ESCAPES[ch])

// Same palette as apps/web/src/index.css (light theme). Email clients ignore CSS variables and
// <style> blocks, so everything is inline.
const C = { bg: '#fafaf9', surface: '#ffffff', line: '#e6e5e1', ink: '#1f1e1c', mid: '#6b6a66', accent: '#6f8463', accentStrong: '#5c7150', accentBg: '#e9eee3' }
const FONT = `'Geist',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif`

/** Branded wrapper shared by every email. `body` must already be escaped HTML. */
export function emailLayout(input: { heading: string; body: string; cta?: { label: string; url: string }; footer?: string }): string {
  const cta = input.cta
    ? `<p style="margin:28px 0 0"><a href="${input.cta.url}" style="display:inline-block;background:${C.accent};color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:12px">${escapeHtml(input.cta.label)}</a></p>
<p style="margin:16px 0 0;font-size:12px;color:${C.mid};word-break:break-all">¿No abre el botón? Copia este enlace:<br><a href="${input.cta.url}" style="color:${C.accentStrong}">${input.cta.url}</a></p>`
    : ''
  return `<!doctype html><html lang="es"><body style="margin:0;padding:0;background:${C.bg}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg}"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;font-family:${FONT};color:${C.ink}">
<tr><td style="padding:0 4px 16px;font-size:18px;font-weight:700;color:${C.accentStrong}">Cada Quien</td></tr>
<tr><td style="background:${C.surface};border:1px solid ${C.line};border-radius:16px;padding:28px">
<h1 style="margin:0 0 12px;font-size:20px;line-height:1.3;color:${C.ink}">${escapeHtml(input.heading)}</h1>
<div style="font-size:15px;line-height:1.6;color:${C.ink}">${input.body}</div>
${cta}
</td></tr>
<tr><td style="padding:16px 4px 0;font-size:12px;line-height:1.5;color:${C.mid}">${input.footer ?? 'Te llegó este correo desde Cada Quien.'} <a href="${env.WEB_ORIGIN}" style="color:${C.mid}">${env.WEB_ORIGIN.replace(/^https?:\/\//, '')}</a></td></tr>
</table></td></tr></table></body></html>`
}
