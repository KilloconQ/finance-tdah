import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { QueryClientProvider } from '@tanstack/react-query'
import { routeTree } from './routeTree.gen'
import { queryClient, SESSION_QUERY_KEY } from './lib/query-client'
import { setSessionExpiredHandler } from './lib/session-reset'
import './index.css'

const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 0,
  scrollRestoration: true,
})

// A 401 from the API means the session is gone: go sign in again.
setSessionExpiredHandler(() => {
  if (router.state.location.pathname.startsWith('/auth/')) return
  void router.navigate({ to: '/auth/sign-in', replace: true })
})

// Coming back to the tab after a while is when the cached session is most
// likely wrong (expired, or signed out elsewhere): the next navigation re-asks.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    void queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY, refetchType: 'none' })
  }
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
)
