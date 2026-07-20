import { cn } from '@/lib/cn'
import { formatMoney } from '@/lib/format'

interface BigNumberProps {
  value: number
  label?: string
  sub?: string
  hidden?: boolean
  size?: 'sm' | 'md' | 'lg' | 'xl'
  tone?: 'ink' | 'good' | 'warn' | 'danger' | 'accent'
  className?: string
}

const SIZE: Record<NonNullable<BigNumberProps['size']>, string> = {
  sm: 'text-4xl sm:text-5xl',
  md: 'text-5xl sm:text-6xl',
  lg: 'text-5xl sm:text-6xl',
  xl: 'text-6xl sm:text-7xl',
}

const TONE: Record<NonNullable<BigNumberProps['tone']>, string> = {
  ink: 'text-ink',
  good: 'text-good',
  warn: 'text-warn',
  danger: 'text-danger',
  accent: 'text-accent',
}

export function BigNumber({
  value,
  label,
  sub,
  hidden,
  size = 'lg',
  tone = 'ink',
  className,
}: BigNumberProps) {
  return (
    <div className={cn('px-2 py-4 text-center', className)}>
      {label ? (
        <div className="mb-2 text-sm font-medium text-ink-mid">{label}</div>
      ) : null}
      <div
        className={cn(
          'money font-semibold leading-none tracking-tight',
          SIZE[size],
          TONE[tone],
        )}
      >
        {hidden ? '••••' : formatMoney(value)}
      </div>
      {sub ? <div className="mt-2 text-sm text-ink-mid">{sub}</div> : null}
    </div>
  )
}
