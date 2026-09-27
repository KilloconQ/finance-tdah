import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
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
