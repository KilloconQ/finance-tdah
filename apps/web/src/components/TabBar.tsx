import { Link, useRouterState } from '@tanstack/react-router'
import { cn } from '@/lib/cn'
import { TABS, isTabActive } from './tabs'

export function TabBar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  return (
    <nav className="sticky bottom-0 left-0 right-0 -mx-4 flex border-t border-line bg-surface px-2 pt-2 pb-6 sm:-mx-6 sm:px-4 md:hidden">
      {TABS.filter((tab) => !tab.desktopOnly).map((tab) => {
        const isActive = isTabActive(tab, pathname)
        const Icon = tab.icon
        return (
          <Link
            key={tab.to}
            to={tab.to}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'flex flex-1 flex-col items-center gap-1 py-1.5 text-xs',
              isActive ? 'font-semibold text-accent-strong' : 'text-ink-mid',
            )}
          >
            <Icon size={24} strokeWidth={isActive ? 2.4 : 1.9} />
            <span>{tab.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
