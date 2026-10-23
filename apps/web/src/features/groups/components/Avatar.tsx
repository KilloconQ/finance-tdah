export function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-accent-bg font-semibold text-accent-strong ${
        size === 'sm' ? 'h-9 w-9 text-sm' : 'h-10 w-10 text-sm'
      }`}
    >
      {name.trim()[0]?.toUpperCase() ?? '?'}
    </span>
  )
}
