import { Link, useRouterState } from '@tanstack/react-router'
import { Home, Receipt, Repeat, Wallet, Flame, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'

export const TABS: ReadonlyArray<{ to: string; label: string; icon: LucideIcon }> = [
  { to: '/', label: 'Hoy', icon: Home },
  { to: '/transactions', label: 'Mov.', icon: Receipt },
  { to: '/subscriptions', label: 'Subs.', icon: Repeat },
  { to: '/accounts', label: 'Cuentas', icon: Wallet },
  { to: '/challenge', label: 'Retos', icon: Flame },
]

export function TabBar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  return (
    <nav className="sticky bottom-0 left-0 right-0 -mx-4 flex border-t border-line bg-surface px-2 pt-2 pb-6 sm:-mx-6 sm:px-4 md:hidden">
      {TABS.map((tab) => {
        const isActive =
          tab.to === '/' ? pathname === '/' : pathname.startsWith(tab.to)
        const Icon = tab.icon
        return (
          <Link
            key={tab.to}
            to={tab.to}
            className={cn(
              'flex flex-1 flex-col items-center gap-1 py-1.5 text-xs',
              isActive ? 'font-semibold text-accent-strong' : 'text-ink-soft',
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
