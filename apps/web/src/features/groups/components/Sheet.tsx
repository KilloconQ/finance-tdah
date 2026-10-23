import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { IconButton } from '@/components'

/** Bottom sheet, the native-style home for a short form. Closes on Escape or a tap outside. */
export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 md:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-bg px-4 pb-8 pt-2 md:rounded-3xl"
      >
        <div className="mx-auto mb-1 h-1 w-10 rounded-full bg-line md:hidden" />
        <div className="grid min-h-11 grid-cols-[44px_1fr_44px] items-center">
          <span />
          <h2 className="text-center text-base font-semibold text-ink">{title}</h2>
          <IconButton onClick={onClose} label="Cerrar">
            <X size={20} strokeWidth={2} />
          </IconButton>
        </div>
        {children}
      </div>
    </div>
  )
}
