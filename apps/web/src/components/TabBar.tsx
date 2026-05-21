import { Link, useRouterState } from '@tanstack/react-router'
import { cn } from '@/lib/cn'

const TABS = [
  { to: '/', label: 'Hoy' },
  { to: '/transactions', label: 'Mov.' },
  { to: '/subscriptions', label: 'Subs.' },
  { to: '/accounts', label: 'Cuentas' },
] as const

export function TabBar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  return (
    <nav className="flex border-t border-line bg-surface px-1 pt-2 pb-6">
      {TABS.map((tab) => {
        const isActive =
          tab.to === '/' ? pathname === '/' : pathname.startsWith(tab.to)
        return (
          <Link
            key={tab.to}
            to={tab.to}
            className={cn(
              'flex flex-1 flex-col items-center gap-1 text-[11px]',
              isActive ? 'text-ink font-semibold' : 'text-ink-soft',
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
  )
}
