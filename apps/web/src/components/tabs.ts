import { Home, Receipt, Repeat, Users, Wallet, Flame, type LucideIcon } from 'lucide-react'

type Tab = {
  to: string
  label: string
  icon: LucideIcon
  /** Only in the desktop sidebar: on phones it is reached from the "Dinero" hub or from Hoy. */
  desktopOnly?: boolean
  /** Only in the mobile tab bar. */
  mobileOnly?: boolean
  /** Other screens this tab leads to, so it stays highlighted on them. */
  alsoActiveOn?: ReadonlyArray<string>
}

export const TABS: ReadonlyArray<Tab> = [
  { to: '/', label: 'Hoy', icon: Home },
  { to: '/transactions', label: 'Movimientos', icon: Receipt },
  {
    to: '/money',
    label: 'Dinero',
    icon: Wallet,
    mobileOnly: true,
    alsoActiveOn: ['/accounts', '/goals', '/subscriptions'],
  },
  { to: '/subscriptions', label: 'Suscrip.', icon: Repeat, desktopOnly: true },
  { to: '/accounts', label: 'Cuentas', icon: Wallet, desktopOnly: true },
  { to: '/groups', label: 'Grupos', icon: Users },
  { to: '/challenge', label: 'Retos', icon: Flame, desktopOnly: true },
]

export const isTabActive = (tab: Tab, pathname: string) =>
  tab.to === '/'
    ? pathname === '/'
    : [tab.to, ...(tab.alsoActiveOn ?? [])].some((p) => pathname.startsWith(p))
