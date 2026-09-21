import { useRef } from 'react'
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
  // Guards against a second finger stealing/ending the press and against a
  // release event firing without a matching press (lost capture, stray up).
  const activePointerId = useRef<number | null>(null)

  const release = (e: React.PointerEvent) => {
    if (e.pointerId !== activePointerId.current) return
    activePointerId.current = null
    onRelease?.()
  }

  return (
    <div className="text-center">
      <button
        type="button"
        onPointerDown={(e) => {
          if (activePointerId.current !== null) return
          activePointerId.current = e.pointerId
          e.preventDefault()
          e.currentTarget.setPointerCapture(e.pointerId)
          onPress?.()
        }}
        onPointerUp={release}
        onPointerCancel={release}
        onLostPointerCapture={release}
        style={{ width: size, height: size }}
        className={cn(
          'wf-tap relative mx-auto flex touch-none items-center justify-center rounded-full border-[1.5px] border-accent select-none [-webkit-touch-callout:none]',
          recording ? 'bg-accent' : 'bg-surface',
        )}
        aria-label={label}
      >
        {recording ? (
          <span
            aria-hidden
            className="absolute inset-[-12px] rounded-full border border-accent opacity-30"
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
            stroke={recording ? 'var(--color-surface)' : 'var(--color-accent)'}
            strokeWidth={1.5}
          />
          <path
            d="M5 11a7 7 0 0 0 14 0M12 18v3"
            stroke={recording ? 'var(--color-surface)' : 'var(--color-accent)'}
            strokeWidth={1.5}
            strokeLinecap="round"
          />
        </svg>
      </button>
      {label ? <div className="mt-4 text-[13px] text-ink-mid">{label}</div> : null}
    </div>
  )
}
