import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { Sidebar } from '@/components'
import { authClient } from '@/lib/auth-client'

export const Route = createFileRoute('/_app')({
  beforeLoad: async () => {
    const session = await authClient.getSession()
    if (session.error || !session.data) {
      throw redirect({ to: '/auth/sign-in' })
    }
    return { user: session.data.user }
  },
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
