import { Home, Receipt, Repeat, Wallet, Flame, type LucideIcon } from 'lucide-react'

export const TABS: ReadonlyArray<{ to: string; label: string; icon: LucideIcon; desktopOnly?: boolean }> = [
  { to: '/', label: 'Hoy', icon: Home },
  { to: '/transactions', label: 'Mov.', icon: Receipt },
  { to: '/subscriptions', label: 'Subs.', icon: Repeat, desktopOnly: true },
  { to: '/accounts', label: 'Cuentas', icon: Wallet },
  { to: '/challenge', label: 'Retos', icon: Flame },
]
