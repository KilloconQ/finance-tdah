import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface PhoneShellProps {
  children: ReactNode
  bg?: 'bg' | 'surface' | 'bg-alt'
  className?: string
}

const BG_CLASS = {
  bg: 'bg-bg',
  surface: 'bg-surface',
  'bg-alt': 'bg-bg-alt',
} as const

export function PhoneShell({ children, bg = 'bg', className }: PhoneShellProps) {
  return (
    <div className={cn('mx-auto flex h-full max-w-[420px] flex-col overflow-hidden md:my-4 md:rounded-[36px] md:border md:border-line md:shadow-sm', BG_CLASS[bg], className)}>
      <StatusBar />
      <div className="flex flex-1 flex-col overflow-hidden">{children}</div>
    </div>
  )
}

function StatusBar() {
  return (
    <div className="wf-mono flex h-7 items-center justify-between px-5 pt-2 text-[11px] text-ink-soft">
      <span>9:41</span>
      <span aria-hidden>•••</span>
    </div>
  )
}
