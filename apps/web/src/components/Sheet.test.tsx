import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { Sheet } from './Sheet'

afterEach(cleanup)

function Host() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button onClick={() => setOpen(true)}>Open</button>
      {open ? (
        <Sheet title="Registrar" onClose={() => setOpen(false)}>
          <input aria-label="Cuánto" autoFocus />
        </Sheet>
      ) : null}
    </>
  )
}

describe('Sheet', () => {
  it('locks body scroll while open and restores it, and returns focus to the opener', async () => {
    const user = userEvent.setup()
    render(<Host />)
    const opener = screen.getByRole('button', { name: 'Open' })
    await user.click(opener)

    expect(document.body.style.overflow).toBe('hidden')
    expect(document.activeElement).toBe(screen.getByLabelText('Cuánto'))

    await user.keyboard('{Escape}')
    expect(document.body.style.overflow).toBe('')
    expect(document.activeElement).toBe(opener)
  })

  it('focuses the dialog itself when nothing inside took focus', async () => {
    const user = userEvent.setup()
    render(<Sheet title="Hola" onClose={() => {}}>text</Sheet>)
    expect(document.activeElement).toBe(screen.getByRole('dialog'))
    await user.tab()
    expect(screen.getByRole('button', { name: 'Cerrar' })).toBe(document.activeElement)
  })

  describe('swipe down', () => {
    const swipe = (dy: number) => {
      const strip = screen.getByText('Hola').closest('.touch-none')!
      fireEvent.pointerDown(strip, { pointerType: 'touch', clientY: 100, pointerId: 1 })
      fireEvent.pointerMove(strip, { pointerType: 'touch', clientY: 100 + dy, pointerId: 1 })
      fireEvent.pointerUp(strip, { pointerType: 'touch', clientY: 100 + dy, pointerId: 1 })
    }

    it('closes after a long swipe down', () => {
      let closed = false
      render(<Sheet title="Hola" onClose={() => (closed = true)}>x</Sheet>)
      swipe(150)
      expect(closed).toBe(true)
    })

    it('stays open on a short swipe', () => {
      let closed = false
      render(<Sheet title="Hola" onClose={() => (closed = true)}>x</Sheet>)
      swipe(40)
      expect(closed).toBe(false)
    })

    it('springs back instead of closing while dirty', () => {
      let closed = false
      render(<Sheet title="Hola" dirty onClose={() => (closed = true)}>x</Sheet>)
      swipe(150)
      expect(closed).toBe(false)
    })
  })
})
