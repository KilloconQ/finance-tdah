import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface HelloProps {
  children: ReactNode
  className?: string
}

export function Hello({ children, className }: HelloProps) {
  return (
    <div className={cn('text-[14px] leading-snug text-ink-mid', className)}>
      {children}
    </div>
  )
}
