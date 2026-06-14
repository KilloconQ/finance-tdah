import { Link, useRouterState } from '@tanstack/react-router'
import { cn } from '@/lib/cn'
import { TABS } from './TabBar'

/**
 * Desktop / tablet navigation. Hidden on phones (the bottom TabBar takes over).
 * Persistent left rail rendered once by the `_app` layout, not per screen.
 */
export function Sidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  return (
    <aside className="hidden w-56 shrink-0 flex-col border-r border-line bg-surface px-3 py-5 md:flex">
      <div className="px-3 pb-6 text-[15px] font-semibold tracking-tight text-ink">
        finance
      </div>
      <nav className="flex flex-col gap-1">
        {TABS.map((tab) => {
          const isActive =
            tab.to === '/' ? pathname === '/' : pathname.startsWith(tab.to)
          return (
            <Link
              key={tab.to}
              to={tab.to}
              className={cn(
                'wf-tap flex items-center gap-3 rounded-lg px-3 py-2 text-[13px]',
                isActive
                  ? 'bg-accent-bg font-semibold text-ink'
                  : 'text-ink-soft hover:text-ink-mid',
              )}
            >
              <span
                className={cn(
                  'h-[18px] w-[18px] rounded-[4px]',
                  isActive ? 'bg-ink' : 'bg-line-soft',
                )}
                aria-hidden
              />
              <span>{tab.label}</span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
