import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface EmptyStateProps {
  /** Optional leading icon (e.g. a lucide glyph). */
  icon?: ReactNode
  title: ReactNode
  hint?: ReactNode
  /** Optional call-to-action (usually a <Btn>). */
  action?: ReactNode
  className?: string
}

/**
 * Friendly empty placeholder for lists / dashboards with no data yet.
 */
export function EmptyState({ icon, title, hint, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center px-6 py-12 text-center',
        className,
      )}
    >
      {icon ? (
        <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-accent-bg text-accent-strong">
          {icon}
        </div>
      ) : null}
      <div className="text-base font-semibold text-ink">{title}</div>
      {hint ? <div className="mt-1.5 max-w-sm text-sm text-ink-mid">{hint}</div> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}
