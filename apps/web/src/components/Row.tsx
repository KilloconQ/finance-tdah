import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface RowProps {
  left?: ReactNode
  title: ReactNode
  sub?: ReactNode
  right?: ReactNode
  rightSub?: ReactNode
  onClick?: () => void
  className?: string
}

export function Row({ left, title, sub, right, rightSub, onClick, className }: RowProps) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 border-b border-line-soft py-3.5 text-left',
        onClick && 'wf-tap rounded-xl hover:bg-bg-alt',
        className,
      )}
    >
      {left ? <div className="shrink-0">{left}</div> : null}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-ink">{title}</div>
        {sub ? <div className="mt-0.5 text-xs text-ink-mid">{sub}</div> : null}
      </div>
      {(right || rightSub) && (
        <div className="shrink-0 text-right">
          {right ? <div>{right}</div> : null}
          {rightSub ? <div className="mt-0.5 text-xs text-ink-soft">{rightSub}</div> : null}
        </div>
      )}
    </Tag>
  )
}
