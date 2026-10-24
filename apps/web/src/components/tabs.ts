import { Home, Receipt, Repeat, Users, Wallet, Flame, type LucideIcon } from 'lucide-react'

export const TABS: ReadonlyArray<{ to: string; label: string; icon: LucideIcon; desktopOnly?: boolean }> = [
  { to: '/', label: 'Hoy', icon: Home },
  { to: '/transactions', label: 'Movimientos', icon: Receipt },
  { to: '/subscriptions', label: 'Suscrip.', icon: Repeat, desktopOnly: true },
  { to: '/accounts', label: 'Cuentas', icon: Wallet },
  { to: '/groups', label: 'Grupos', icon: Users },
  { to: '/challenge', label: 'Retos', icon: Flame },
]
