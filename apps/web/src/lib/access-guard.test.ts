import { isRedirect } from '@tanstack/react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { queryClient } from './query-client'
import { requireOnboardedAndPaid } from './access-guard'

const fetchValidated = vi.hoisted(() => vi.fn())
vi.mock('./api', () => ({ fetchValidated, api: {} }))

const stub = (profile: unknown, billing: unknown) =>
  fetchValidated.mockImplementation(async (path: string) =>
    path === '/profile' ? { profile } : billing,
  )
const target = (e: unknown) => (e as { options: { to: string } }).options.to

afterEach(() => {
  queryClient.clear()
  fetchValidated.mockReset()
})

describe('requireOnboardedAndPaid', () => {
  it('sends a user who has not onboarded on this platform to onboarding', async () => {
    stub({ onboardingCompleted: false }, { required: false, hasAccess: true })
    const thrown = await requireOnboardedAndPaid().catch((e: unknown) => e)
    expect(isRedirect(thrown)).toBe(true)
    expect(target(thrown)).toBe('/onboarding')
  })

  it('sends a user with no profile to onboarding', async () => {
    stub(null, { required: false, hasAccess: true })
    expect(target(await requireOnboardedAndPaid().catch((e: unknown) => e))).toBe('/onboarding')
  })

  it('sends an onboarded user without access to the paywall', async () => {
    stub({ onboardingCompleted: true }, { required: true, hasAccess: false })
    expect(target(await requireOnboardedAndPaid().catch((e: unknown) => e))).toBe('/paywall')
  })

  it('lets through an onboarded user with access (no paywall in dev: hasAccess is true)', async () => {
    stub({ onboardingCompleted: true }, { required: false, hasAccess: true })
    await expect(requireOnboardedAndPaid()).resolves.toBeUndefined()
  })
})
