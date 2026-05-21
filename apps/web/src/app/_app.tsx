import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
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
  return <Outlet />
}
