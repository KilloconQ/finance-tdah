import { redirect } from '@tanstack/react-router'
import { queryClient } from './query-client'
import { billingStatusQuery, profileQuery } from './queries'

const FRESH_MS = 60_000

/**
 * Sends someone who hasn't done the web onboarding to it, and someone without access to the
 * paywall. Billing is off in dev/local (`required: false`), so there the second check never fires.
 */
export async function requireOnboardedAndPaid(): Promise<void> {
  const profile = await queryClient.fetchQuery({ ...profileQuery(), staleTime: FRESH_MS })
  if (!profile?.onboardingCompleted) throw redirect({ to: '/onboarding' })
  const billing = await queryClient.fetchQuery({ ...billingStatusQuery(), staleTime: FRESH_MS })
  if (!billing.hasAccess) throw redirect({ to: '/paywall' })
}
