import { useEffect, useRef, useState, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { IconButton } from './AppBar'

/**
 * Bottom sheet, the native-style home for a short form. Closes on Escape or a tap outside.
 * `dirty` (unsaved input) makes Escape and the backdrop inert; `busy` (a save in flight) also disables the X.
 */
export function Sheet({
  title,
  onClose,
  dirty = false,
  busy = false,
  children,
}: {
  title: string
  onClose: () => void
  dirty?: boolean
  busy?: boolean
  children: ReactNode
}) {
  const guarded = dirty || busy
  // Refs keep the Escape listener subscribed once instead of per render.
  const latest = useRef({ onClose, guarded })
  useEffect(() => {
    latest.current = { onClose, guarded }
  })
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !latest.current.guarded && latest.current.onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const dialogRef = useRef<HTMLDivElement>(null)
  // Read during the first render: the form's autoFocus has already moved focus by the time effects run.
  const [opener] = useState(() => document.activeElement as HTMLElement | null)
  // Lock background scroll; hand focus to the dialog (unless the form already took it) and give it back on close.
  useEffect(() => {
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const dialog = dialogRef.current
    if (dialog && !dialog.contains(document.activeElement)) dialog.focus()
    return () => {
      document.body.style.overflow = prevOverflow
      opener?.focus?.()
    }
  }, [opener])
  // Keep Tab inside the dialog by wrapping at its first and last focusable element.
  const trapTab = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab') return
    const items = e.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])')
    const first = items[0]
    const last = items[items.length - 1]
    if (!first) return e.preventDefault()
    if (e.shiftKey && (document.activeElement === first || document.activeElement === e.currentTarget)) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  // Swipe down on the top strip (handle + title) to dismiss; touch/pen only, so desktop mouse is unaffected.
  // A guarded sheet (unsaved input or a save in flight) springs back instead of closing.
  const [dragY, setDragY] = useState(0)
  const [dragging, setDragging] = useState(false)
  const startY = useRef<number | null>(null)
  const onDragStart = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse') return
    startY.current = e.clientY
  }
  const onDragMove = (e: React.PointerEvent) => {
    if (startY.current === null) return
    const dy = Math.max(0, e.clientY - startY.current)
    if (!dragging && dy < 6) return // let taps (e.g. the X button) through as clicks
    if (!dragging) {
      e.currentTarget.setPointerCapture?.(e.pointerId)
      setDragging(true)
    }
    setDragY(dy)
  }
  const onDragEnd = () => {
    if (startY.current === null) return
    startY.current = null
    const close = dragY > 100 && !guarded
    setDragging(false)
    setDragY(0)
    if (close) onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 md:items-center" onClick={() => !guarded && onClose()}>
      <div
        ref={dialogRef}
        tabIndex={-1}
        onKeyDown={trapTab}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        style={dragY ? { transform: `translateY(${dragY}px)` } : undefined}
        className={`motion-safe:animate-sheet-up max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-bg outline-none px-4 pb-8 pt-2 md:rounded-3xl ${dragging ? '' : 'transition-transform duration-200'}`}
      >
        <div
          className="touch-none"
          onPointerDown={onDragStart}
          onPointerMove={onDragMove}
          onPointerUp={onDragEnd}
          onPointerCancel={onDragEnd}
        >
          <div className="mx-auto mb-1 h-1 w-10 rounded-full bg-line md:hidden" />
          <div className="grid min-h-11 grid-cols-[44px_1fr_44px] items-center">
            <span />
            <h2 className="text-center text-base font-semibold text-ink">{title}</h2>
            <IconButton onClick={() => !busy && onClose()} label="Cerrar">
              <X size={20} strokeWidth={2} />
            </IconButton>
          </div>
        </div>
        {children}
      </div>
    </div>
  )
}
