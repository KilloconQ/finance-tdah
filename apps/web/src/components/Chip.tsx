import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface ChipProps {
  children: ReactNode
  active?: boolean
  onClick?: () => void
  className?: string
}

export function Chip({ children, active, onClick, className }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'wf-tap inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[12px]',
        active
          ? 'border-ink bg-ink text-surface'
          : 'border-line bg-surface text-ink-mid',
        className,
      )}
    >
      {children}
    </button>
  )
}
