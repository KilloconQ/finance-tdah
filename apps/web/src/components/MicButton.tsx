import { cn } from '@/lib/cn'

interface MicButtonProps {
  size?: number
  recording?: boolean
  label?: string
  onPress?: () => void
  onRelease?: () => void
}

export function MicButton({
  size = 120,
  recording = false,
  label = 'Mantén para hablar',
  onPress,
  onRelease,
}: MicButtonProps) {
  return (
    <div className="text-center">
      <button
        type="button"
        onMouseDown={onPress}
        onMouseUp={onRelease}
        onMouseLeave={onRelease}
        onTouchStart={onPress}
        onTouchEnd={onRelease}
        style={{ width: size, height: size }}
        className={cn(
          'wf-tap relative mx-auto flex items-center justify-center rounded-full border-[1.5px] border-ink',
          recording ? 'bg-ink' : 'bg-surface',
        )}
        aria-label={label}
      >
        {recording ? (
          <span
            aria-hidden
            className="absolute inset-[-12px] rounded-full border border-ink opacity-30"
            style={{ animation: 'pulse-ring 1.4s ease-out infinite' }}
          />
        ) : null}
        <svg
          width={size * 0.32}
          height={size * 0.32}
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden
        >
          <rect
            x={9}
            y={3}
            width={6}
            height={12}
            rx={3}
            stroke={recording ? 'var(--color-surface)' : 'var(--color-ink)'}
            strokeWidth={1.5}
          />
          <path
            d="M5 11a7 7 0 0 0 14 0M12 18v3"
            stroke={recording ? 'var(--color-surface)' : 'var(--color-ink)'}
            strokeWidth={1.5}
            strokeLinecap="round"
          />
        </svg>
      </button>
      {label ? <div className="mt-4 text-[13px] text-ink-mid">{label}</div> : null}
    </div>
  )
}
