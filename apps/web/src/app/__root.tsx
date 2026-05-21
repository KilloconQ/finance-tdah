import { createRootRoute, Outlet } from '@tanstack/react-router'
import { TweaksPanel } from '@/components/TweaksPanel'

export const Route = createRootRoute({
  component: RootLayout,
})

function RootLayout() {
  return (
    <div className="flex h-full min-h-dvh justify-center">
      <Outlet />
      <TweaksPanel />
    </div>
  )
}
