import { cn } from '@/lib/cn'

interface DotsProps {
  total?: number
  filled?: number
  size?: number
  gap?: number
  className?: string
}

export function Dots({ total = 7, filled = 4, size = 10, gap = 6, className }: DotsProps) {
  return (
    <div className={cn('inline-flex', className)} style={{ gap }}>
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          style={{ width: size, height: size }}
          className={cn(
            'rounded-full border',
            i < filled ? 'border-ink bg-ink' : 'border-line bg-transparent',
          )}
          aria-hidden
        />
      ))}
    </div>
  )
}
