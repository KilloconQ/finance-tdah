import { Link, useRouterState } from '@tanstack/react-router'
import { cn } from '@/lib/cn'
import { isTabActive, MOBILE_TABS } from './tabs'

export function TabBar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  return (
    <nav
      aria-label="Principal"
      className="sticky bottom-0 left-0 right-0 -mx-4 flex border-t border-line bg-surface px-2 pt-2 pb-6 sm:-mx-6 sm:px-4 md:hidden"
    >
      {MOBILE_TABS.map((tab) => {
        const isActive = isTabActive(tab, pathname)
        const Icon = tab.icon
        return (
          <Link
            key={tab.to}
            to={tab.to}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'flex min-h-12 flex-1 flex-col items-center gap-1 py-1 text-xs',
              isActive ? 'font-semibold text-accent-strong' : 'text-ink-mid',
            )}
          >
            <span
              className={cn(
                'grid h-[30px] w-14 place-items-center rounded-full transition-colors',
                isActive && 'bg-accent-bg',
              )}
            >
              <Icon size={22} strokeWidth={isActive ? 2.4 : 1.9} />
            </span>
            <span>{tab.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
