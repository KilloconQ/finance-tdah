import { MutationCache, QueryClient } from '@tanstack/react-query'
import { TIMEOUT } from './auth-errors'

export const queryClient = new QueryClient({
  // Runs before each screen's own onError, which shows `err.message`: a ky
  // timeout would otherwise surface as raw English ("Request timed out: POST …").
  mutationCache: new MutationCache({
    onError: (err) => {
      if (err instanceof Error && err.name === 'TimeoutError') err.message = TIMEOUT
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

/**
 * Lives here rather than next to `sessionQuery` so `auth-client` can drop the
 * cached session without importing the module that imports it.
 */
export const SESSION_QUERY_KEY = ['session'] as const
