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
    <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-surface px-3 py-5 md:flex">
      <div className="flex items-center gap-2 px-3 pb-7">
        <span className="h-7 w-7 rounded-xl bg-accent" aria-hidden />
        <span className="text-base font-semibold tracking-tight text-ink">finance</span>
      </div>
      <nav className="flex flex-col gap-1">
        {TABS.map((tab) => {
          const isActive =
            tab.to === '/' ? pathname === '/' : pathname.startsWith(tab.to)
          const Icon = tab.icon
          return (
            <Link
              key={tab.to}
              to={tab.to}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors',
                isActive
                  ? 'bg-accent-bg font-semibold text-accent-strong'
                  : 'text-ink-mid hover:bg-bg-alt hover:text-ink',
              )}
            >
              <Icon size={18} strokeWidth={isActive ? 2.4 : 1.9} />
              <span>{tab.label}</span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
