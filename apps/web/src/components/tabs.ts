import { Ellipsis, Home, Receipt, Repeat, Wallet, Flame, type LucideIcon } from 'lucide-react'

export interface Tab {
  to: string
  label: string
  icon: LucideIcon
  /** Extra path prefixes that also light this tab up (the "Más" hub owns its children). */
  match?: ReadonlyArray<string>
}

/** Desktop / tablet sidebar: every top-level destination. */
export const TABS: ReadonlyArray<Tab> = [
  { to: '/', label: 'Hoy', icon: Home },
  { to: '/transactions', label: 'Mov.', icon: Receipt },
  { to: '/subscriptions', label: 'Subs.', icon: Repeat },
  { to: '/accounts', label: 'Cuentas', icon: Wallet },
  { to: '/challenge', label: 'Retos', icon: Flame },
]

/**
 * Phone bottom bar: four stops at most. Subscriptions, challenges and settings
 * live under "Más" so the bar stays calm and the labels can be spelled out.
 */
export const MOBILE_TABS: ReadonlyArray<Tab> = [
  { to: '/', label: 'Hoy', icon: Home },
  { to: '/transactions', label: 'Movimientos', icon: Receipt },
  { to: '/accounts', label: 'Cuentas', icon: Wallet },
  {
    to: '/more',
    label: 'Más',
    icon: Ellipsis,
    match: ['/more', '/subscriptions', '/challenge', '/settings'],
  },
]

export function isTabActive(tab: Tab, pathname: string): boolean {
  if (tab.to === '/') return pathname === '/'
  return (tab.match ?? [tab.to]).some((prefix) => pathname.startsWith(prefix))
}
