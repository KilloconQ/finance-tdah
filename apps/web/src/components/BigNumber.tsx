import { cn } from '@/lib/cn'
import { formatMoney } from '@/lib/format'

interface BigNumberProps {
  value: number
  label?: string
  sub?: string
  hidden?: boolean
  size?: 'sm' | 'md' | 'lg' | 'xl'
  tone?: 'ink' | 'good' | 'warn' | 'danger' | 'accent'
}

const SIZE: Record<NonNullable<BigNumberProps['size']>, string> = {
  sm: 'text-[40px]',
  md: 'text-[52px]',
  lg: 'text-[64px]',
  xl: 'text-[72px]',
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
}: BigNumberProps) {
  return (
    <div className="text-center px-6 py-5">
      {label ? (
        <div className="wf-mono mb-3 text-[12px] uppercase tracking-[0.1em] text-ink-mid">
          {label}
        </div>
      ) : null}
      <div
        className={cn(
          'wf-mono font-light leading-none tracking-[-0.03em]',
          SIZE[size],
          TONE[tone],
        )}
      >
        {hidden ? '••••' : formatMoney(value)}
      </div>
      {sub ? <div className="mt-2 text-[13px] text-ink-mid">{sub}</div> : null}
    </div>
  )
}
