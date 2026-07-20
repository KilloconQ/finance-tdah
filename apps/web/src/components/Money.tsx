import { cn } from '@/lib/cn'
import { formatMoney } from '@/lib/format'

interface MoneyProps {
  value: number
  hidden?: boolean
  className?: string
  weight?: 'light' | 'regular' | 'medium' | 'semibold'
  mono?: boolean
}

const WEIGHT: Record<NonNullable<MoneyProps['weight']>, string> = {
  light: 'font-light',
  regular: 'font-normal',
  medium: 'font-medium',
  semibold: 'font-semibold',
}

export function Money({
  value,
  hidden = false,
  className,
  weight = 'medium',
  // Retained for backward-compat; money now renders sans tabular by default.
  mono = false,
}: MoneyProps) {
  return (
    <span
      className={cn(
        mono ? 'wf-mono' : 'money',
        WEIGHT[weight],
        hidden ? 'tracking-[0.1em]' : undefined,
        className,
      )}
    >
      {formatMoney(value, hidden)}
    </span>
  )
}
