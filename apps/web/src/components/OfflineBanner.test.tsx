import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { OfflineBanner } from './OfflineBanner'
import { ExpenseForm } from '@/features/expenses/components/ExpenseForm'
import { queryClient } from '@/lib/query-client'
import { TIMEOUT } from '@/lib/auth-errors'

function goOffline(offline: boolean) {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(!offline)
  act(() => {
    window.dispatchEvent(new Event(offline ? 'offline' : 'online'))
  })
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('OfflineBanner', () => {
  it('shows only while the browser is offline, and follows online/offline events', () => {
    render(<OfflineBanner />)
    expect(screen.queryByRole('status')).toBeNull()

    goOffline(true)
    expect(screen.getByRole('status').textContent).toBe(
      'Sin conexión. Tus cambios se guardarán cuando vuelvas a conectarte.',
    )

    goOffline(false)
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('starts visible when the page loads already offline', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    render(<OfflineBanner />)
    expect(screen.getByRole('status')).toBeTruthy()
  })
})

describe('pending save while offline', () => {
  it('says it is waiting for the connection instead of "Guardando…"', () => {
    render(<ExpenseForm accounts={[]} submitting error={null} onSubmit={() => {}} />)
    expect(screen.getByRole('button', { name: 'Guardando…' })).toBeTruthy()

    goOffline(true)
    expect(screen.getByRole('button', { name: 'Esperando conexión…' })).toBeTruthy()

    goOffline(false)
    expect(screen.getByRole('button', { name: 'Guardando…' })).toBeTruthy()
  })
})

describe('mutation timeouts', () => {
  it('turn into the calm Spanish message before the screen reads err.message', async () => {
    const timeout = new Error('Request timed out: POST /api/expenses')
    timeout.name = 'TimeoutError'
    const err = await queryClient
      .getMutationCache()
      .build(queryClient, {
        mutationFn: () => Promise.reject(timeout),
      })
      .execute(undefined)
      .catch((e: Error) => e)
    expect((err as Error).message).toBe(TIMEOUT)
    expect(TIMEOUT).toBe('Tarda más de lo normal. Revisa tu conexión e inténtalo de nuevo.')
  })
})
