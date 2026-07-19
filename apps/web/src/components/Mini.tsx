import { cn } from '@/lib/cn'
import { formatMoney } from '@/lib/format'

interface MiniProps {
  label: string
  value: string | number
  hidden?: boolean
  compact?: boolean
  mono?: boolean
}

export function Mini({ label, value, hidden, compact, mono = false }: MiniProps) {
  const isNumber = typeof value === 'number'
  const rendered = isNumber ? formatMoney(value as number, hidden) : value
  return (
    <div
      className={cn(
        compact
          ? 'flex-1 rounded-xl border border-line bg-surface px-3.5 py-3 text-left'
          : 'text-center',
      )}
    >
      <div className="text-xs font-medium text-ink-mid">{label}</div>
      <div
        className={cn(
          (isNumber || mono) && (mono ? 'wf-mono' : 'money'),
          compact ? 'mt-1 text-sm font-medium' : 'mt-1 text-base font-medium',
          'text-ink',
        )}
      >
        {hidden && typeof value === 'string' ? '••••' : rendered}
      </div>
    </div>
  )
}
