import { createRootRoute, Outlet } from '@tanstack/react-router'

export const Route = createRootRoute({
  component: RootLayout,
})

function RootLayout() {
  return (
    <div className="flex h-full min-h-dvh justify-center bg-bg-alt">
      <Outlet />
    </div>
  )
}
