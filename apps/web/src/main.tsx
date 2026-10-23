import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { QueryClientProvider } from '@tanstack/react-query'
import { NotFoundScreen, RouteErrorScreen } from './components'
import { routeTree } from './routeTree.gen'
import { queryClient, SESSION_QUERY_KEY } from './lib/query-client'
import { onAuthChange } from './lib/auth-broadcast'
import { clearSessionCache, setSessionExpiredHandler } from './lib/session-reset'
import { initTheme } from './lib/theme'
import './index.css'

initTheme()

// A malformed percent-escape (/%E0%A4%A) makes the router's URL decoding throw
// before anything renders: send those to the home screen instead of a blank page.
try {
  decodeURI(window.location.pathname)
  decodeURIComponent(window.location.search)
} catch {
  window.history.replaceState(null, '', '/')
}

const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 0,
  scrollRestoration: true,
  defaultNotFoundComponent: NotFoundScreen,
  defaultErrorComponent: RouteErrorScreen,
})

// A 401 from the API means the session is gone: go sign in again.
setSessionExpiredHandler(() => {
  if (router.state.location.pathname.startsWith('/auth/')) return
  void router.navigate({ to: '/auth/sign-in', replace: true })
})

// Another tab signed in, out, or as someone else: forget this tab's session and
// the data read under it, then re-run the guard and loaders for the new state.
onAuthChange(() => {
  clearSessionCache()
  void router.invalidate()
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
