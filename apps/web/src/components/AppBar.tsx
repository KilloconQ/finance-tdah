import type { ReactNode } from 'react'
import { ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/cn'

interface AppBarProps {
  title?: ReactNode
  left?: ReactNode
  right?: ReactNode
  sub?: ReactNode
  /** Show a back arrow before the title (detail / sub pages only). */
  back?: boolean
  /** Handler for the back arrow. */
  onBack?: () => void
  className?: string
}

/**
 * Page header. Left-aligned title on md+ with real icon-button slots.
 * `left` still overrides the leading slot; `back` renders a standard back
 * button when no custom `left` is provided. Sits inside the page container,
 * so it carries no page gutter of its own.
 */
export function AppBar({ title, left, right, sub, back, onBack, className }: AppBarProps) {
  const leading =
    left ??
    (back ? (
      <IconButton onClick={onBack} label="Volver">
        <ChevronLeft size={20} strokeWidth={2} />
      </IconButton>
    ) : null)

  return (
    <header className={cn('pt-3 pb-4', className)}>
      <div className="flex min-h-11 items-center gap-2">
        {leading ? <div className="flex shrink-0 items-center">{leading}</div> : null}
        <h1 className="min-w-0 flex-1 truncate text-center text-base font-semibold tracking-tight text-ink md:text-left md:text-xl">
          {title}
        </h1>
        {right ? <div className="flex shrink-0 items-center gap-1">{right}</div> : null}
      </div>
      {sub ? (
        <div className="mt-1 text-center text-[13px] text-ink-mid md:text-left">{sub}</div>
      ) : null}
    </header>
  )
}

/**
 * ≥44px icon-button slot for header actions. Exported so screens can drop real
 * lucide icons into AppBar's `left`/`right` with consistent sizing.
 */
export function IconButton({
  children,
  onClick,
  label,
  className,
}: {
  children: ReactNode
  onClick?: () => void
  label?: string
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        'grid h-11 w-11 place-items-center rounded-xl text-ink-mid transition-colors hover:bg-bg-alt hover:text-ink',
        className,
      )}
    >
      {children}
    </button>
  )
}
