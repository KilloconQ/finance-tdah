import { cn } from '@/lib/cn'
import { formatMoney } from '@/lib/format'

interface MiniProps {
  label: string
  value: string | number
  hidden?: boolean
  compact?: boolean
  mono?: boolean
}

export function Mini({ label, value, hidden, compact, mono = true }: MiniProps) {
  const rendered = typeof value === 'number' ? formatMoney(value, hidden && mono) : value
  return (
    <div
      className={cn(
        compact
          ? 'flex-1 rounded-[10px] border border-line bg-surface px-3 py-2.5 text-left'
          : 'text-center',
      )}
    >
      <div className="wf-mono text-[10px] uppercase tracking-[0.06em] text-ink-mid">
        {label}
      </div>
      <div
        className={cn(
          mono && 'wf-mono',
          compact ? 'mt-1 text-[14px]' : 'mt-1 text-[16px]',
          'text-ink',
        )}
      >
        {hidden && mono && typeof value === 'string' ? '••••' : rendered}
      </div>
    </div>
  )
}
