import { Home, Receipt, Repeat, Wallet, Flame, type LucideIcon } from 'lucide-react'

export const TABS: ReadonlyArray<{ to: string; label: string; icon: LucideIcon }> = [
  { to: '/', label: 'Hoy', icon: Home },
  { to: '/transactions', label: 'Mov.', icon: Receipt },
  { to: '/subscriptions', label: 'Subs.', icon: Repeat },
  { to: '/accounts', label: 'Cuentas', icon: Wallet },
  { to: '/challenge', label: 'Retos', icon: Flame },
]
