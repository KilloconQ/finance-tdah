import { cn } from '@/lib/cn'

interface CatDotProps {
  char: string
  size?: number
  tone?: 'neutral' | 'accent' | 'warn' | 'danger' | 'good'
  className?: string
}

const TONE: Record<NonNullable<CatDotProps['tone']>, string> = {
  neutral: 'bg-bg-alt text-ink-mid border-line',
  accent: 'bg-accent-bg text-accent border-accent/40',
  warn: 'bg-warn-bg text-warn border-warn/40',
  danger: 'bg-danger-bg text-danger border-danger/40',
  good: 'bg-good-bg text-good border-good/40',
}

export function CatDot({ char, size = 32, tone = 'neutral', className }: CatDotProps) {
  return (
    <span
      style={{ width: size, height: size, fontSize: size * 0.42 }}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full border font-medium',
        TONE[tone],
        className,
      )}
    >
      {char}
    </span>
  )
}
