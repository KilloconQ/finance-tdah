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
  mono = true,
}: MoneyProps) {
  return (
    <span
      className={cn(
        mono && 'wf-mono',
        WEIGHT[weight],
        hidden ? 'tracking-[0.1em]' : 'tracking-[-0.01em]',
        className,
      )}
    >
      {formatMoney(value, hidden)}
    </span>
  )
}
