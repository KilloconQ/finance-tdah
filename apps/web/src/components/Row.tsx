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
        'flex w-full items-center gap-3 border-b border-line-soft px-5 py-3 text-left',
        onClick && 'wf-tap',
        className,
      )}
    >
      {left ? <div className="shrink-0">{left}</div> : null}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-medium text-ink">{title}</div>
        {sub ? <div className="mt-0.5 text-[12px] text-ink-mid">{sub}</div> : null}
      </div>
      {(right || rightSub) && (
        <div className="text-right">
          {right ? <div>{right}</div> : null}
          {rightSub ? <div className="mt-0.5 text-[11px] text-ink-soft">{rightSub}</div> : null}
        </div>
      )}
    </Tag>
  )
}
