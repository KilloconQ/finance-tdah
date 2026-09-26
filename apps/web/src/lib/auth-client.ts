import { createAuthClient } from 'better-auth/react'
import { queryClient, SESSION_QUERY_KEY } from './query-client'

const apiUrl = import.meta.env.VITE_API_URL ?? '/api'
const baseURL = apiUrl.replace(/\/api$/, '')

export const authClient = createAuthClient({
  baseURL: baseURL || window.location.origin,
  fetchOptions: {
    // Sign-in, sign-up, sign-out, profile/password changes… any auth call other
    // than reading the session may have changed who is signed in. Dropping the
    // cached session here, before the caller's `await` resolves, means the
    // navigation that follows asks the server instead of trusting a stale copy.
    onSuccess: ({ request }) => {
      if (String(request.url).includes('/get-session')) return
      queryClient.removeQueries({ queryKey: SESSION_QUERY_KEY })
    },
  },
})

export const { useSession, signIn, signUp, signOut } = authClient
