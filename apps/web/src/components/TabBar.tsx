import { Link, useRouterState } from '@tanstack/react-router'
import { Home, Receipt, Repeat, Wallet, Settings, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'

export const TABS: ReadonlyArray<{ to: string; label: string; icon: LucideIcon }> = [
  { to: '/', label: 'Hoy', icon: Home },
  { to: '/transactions', label: 'Mov.', icon: Receipt },
  { to: '/subscriptions', label: 'Subs.', icon: Repeat },
  { to: '/accounts', label: 'Cuentas', icon: Wallet },
  { to: '/settings', label: 'Ajustes', icon: Settings },
]

export function TabBar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  return (
    <nav className="flex border-t border-line bg-surface px-1 pt-2 pb-6 md:hidden">
      {TABS.map((tab) => {
        const isActive =
          tab.to === '/' ? pathname === '/' : pathname.startsWith(tab.to)
        const Icon = tab.icon
        return (
          <Link
            key={tab.to}
            to={tab.to}
            className={cn(
              'flex flex-1 flex-col items-center gap-1 text-[11px]',
              isActive ? 'font-semibold text-accent-strong' : 'text-ink-soft',
            )}
          >
            <Icon size={20} strokeWidth={isActive ? 2.4 : 1.9} />
            <span>{tab.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
