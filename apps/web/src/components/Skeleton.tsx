import { cn } from '@/lib/cn'

interface SkeletonProps {
  className?: string
}

/**
 * Pulsing placeholder block. Compose with sizing utilities to shape it
 * (e.g. `<Skeleton className="h-6 w-32 rounded-lg" />`).
 */
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      aria-hidden
      className={cn('animate-pulse rounded-lg bg-line-soft', className)}
    />
  )
}
