import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { Sidebar } from '@/components'
import { forgetSession, getSession } from '@/lib/session'
import { queryClient, SESSION_QUERY_KEY } from '@/lib/query-client'
import { syncSessionCache } from '@/lib/session-reset'
import { AppError } from './-app-error'

export const Route = createFileRoute('/_app')({
  beforeLoad: async () => {
    // Cached for a few minutes (see `sessionQuery`), so navigating and hovering
    // links doesn't hit the server. A failed check throws SessionCheckError and
    // lands on the error screen in `-app-error.tsx`, which still renders nothing
    // of the app — only a real "no session" redirects to sign-in.
    const session = await getSession()
    if (!session) {
      // Don't keep the null: signing in from another tab must not bounce this one.
      forgetSession()
      throw redirect({ to: '/auth/sign-in' })
    }
    // Before any loader below reads the cache: if this tab last held someone
    // else's session, drop what they left behind — then keep the session we
    // just read so the next navigation doesn't have to ask again.
    if (syncSessionCache(session.user.id)) {
      queryClient.setQueryData(SESSION_QUERY_KEY, session)
    }
    return { user: session.user }
  },
  errorComponent: AppError,
  component: AppLayout,
})

function AppLayout() {
  return (
    <div className="flex min-h-dvh w-full bg-bg">
      <Sidebar />
      {/* Single-tone main so no grey gutter shows between rail and content. */}
      <main className="flex min-h-dvh min-w-0 flex-1 flex-col bg-bg">
        <Outlet />
      </main>
    </div>
  )
}
