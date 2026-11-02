import { useState, type ReactNode } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Sheet } from '@/components'
import { AddExpenseForm } from './AddExpenseContainer'

// Tailwind's `md` breakpoint: below it the add form is a bottom sheet instead of a page.
const MOBILE = '(max-width: 767px)'

/** `open()` shows the add form in a bottom sheet on mobile and goes to /add-expense on desktop. Render `sheet` once. */
export function useAddMovement(): { open: () => void; sheet: ReactNode } {
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [dirty, setDirty] = useState(false)
  const close = () => {
    setIsOpen(false)
    setBusy(false)
    setDirty(false)
  }

  return {
    open: () => {
      if (window.matchMedia?.(MOBILE).matches) setIsOpen(true)
      else void navigate({ to: '/add-expense' })
    },
    sheet: isOpen ? (
      <Sheet title="Registrar" onClose={close} busy={busy} dirty={dirty}>
        <AddExpenseForm onSaved={close} onBusyChange={setBusy} onDirtyChange={setDirty} />
      </Sheet>
    ) : null,
  }
}
