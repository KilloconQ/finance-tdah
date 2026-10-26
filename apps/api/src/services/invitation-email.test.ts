import { beforeEach, describe, expect, it, vi } from 'vitest'

const { send, logError, env } = vi.hoisted(() => ({
  send: vi.fn(),
  logError: vi.fn(),
  env: {
    RESEND_API_KEY: 're_test_key' as string | undefined,
    RESEND_FROM_EMAIL: 'onboarding@resend.dev',
    WEB_ORIGIN: 'http://localhost:5173',
  },
}))

vi.mock('resend', () => ({
  Resend: class {
    emails = { send }
  },
}))
vi.mock('../env', () => ({ env }))
vi.mock('../lib/logger', () => ({ logger: { warn: vi.fn(), error: logError } }))

// The client is built when the module loads, so each test re-imports it after setting the env.
async function load(apiKey: string | undefined) {
  env.RESEND_API_KEY = apiKey
  vi.resetModules()
  return import('./invitation-email')
}

beforeEach(() => {
  send.mockReset()
  logError.mockReset()
})

const invite = { to: 'ben@ejemplo.com', inviterName: 'Ana', groupName: 'Viaje' }

describe('sendGroupInvitationEmail', () => {
  it('emails the invitee a link to the app', async () => {
    send.mockResolvedValueOnce({ id: 'email-1' })
    const { sendGroupInvitationEmail: sendInvite } = await load('re_test_key')

    await sendInvite(invite)

    expect(send).toHaveBeenCalledTimes(1)
    const sent = send.mock.calls[0][0]
    expect(sent).toMatchObject({ to: 'ben@ejemplo.com', from: 'onboarding@resend.dev' })
    expect(sent.subject).toContain('Ana')
    expect(sent.html).toContain('Viaje')
    expect(sent.html).toContain('http://localhost:5173/groups')
  })

  it('escapes names, which anyone can pick, before putting them in the HTML', async () => {
    send.mockResolvedValueOnce({ id: 'email-1' })
    const { sendGroupInvitationEmail: sendInvite } = await load('re_test_key')

    await sendInvite({ ...invite, inviterName: '<img src=x onerror=1>', groupName: '"><script>x</script>' })

    const { html } = send.mock.calls[0][0]
    expect(html).not.toContain('<img')
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;img src=x onerror=1&gt;')
  })

  it('never rejects when Resend fails, so the request that triggered it is unaffected', async () => {
    send.mockRejectedValueOnce(new Error('resend is down'))
    const { sendGroupInvitationEmail: sendInvite } = await load('re_test_key')

    await expect(sendInvite(invite)).resolves.toBeUndefined()
    expect(logError).toHaveBeenCalledWith('group_invitation_email_failed', { message: 'resend is down' })
  })

  it('logs an error Resend returns instead of throwing, such as an unverified recipient on the sandbox sender', async () => {
    send.mockResolvedValueOnce({ data: null, error: { message: 'You can only send testing emails to your own address' } })
    const { sendGroupInvitationEmail: sendInvite } = await load('re_test_key')

    await expect(sendInvite(invite)).resolves.toBeUndefined()
    expect(logError).toHaveBeenCalledWith('group_invitation_email_failed', {
      message: 'You can only send testing emails to your own address',
    })
  })

  it('does nothing without a Resend key', async () => {
    const { sendGroupInvitationEmail: sendInvite } = await load(undefined)

    await expect(sendInvite(invite)).resolves.toBeUndefined()
    expect(send).not.toHaveBeenCalled()
  })
})

describe('sendAppInvitationEmail', () => {
  it('emails a sign-up link with the inviter name escaped', async () => {
    send.mockResolvedValueOnce({ id: 'email-1' })
    const { sendAppInvitationEmail: sendInvite } = await load('re_test_key')

    await sendInvite({ to: 'nueva@ejemplo.com', inviterName: '<b>Ana</b>' })

    const sent = send.mock.calls[0][0]
    expect(sent).toMatchObject({ to: 'nueva@ejemplo.com', from: 'onboarding@resend.dev' })
    expect(sent.subject).toContain('Cada Quien')
    expect(sent.html).toContain('http://localhost:5173/auth/sign-up')
    expect(sent.html).toContain('&lt;b&gt;Ana&lt;/b&gt;')
    expect(sent.html).not.toContain('<b>Ana')
  })

  it('never rejects when Resend fails', async () => {
    send.mockRejectedValueOnce(new Error('resend is down'))
    const { sendAppInvitationEmail: sendInvite } = await load('re_test_key')

    await expect(sendInvite({ to: 'nueva@ejemplo.com', inviterName: 'Ana' })).resolves.toBeUndefined()
    expect(logError).toHaveBeenCalledWith('app_invitation_email_failed', { message: 'resend is down' })
  })
})
