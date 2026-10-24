import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>,
}))

import { NotFoundScreen, RouteErrorScreen } from './RouteFallback'

afterEach(cleanup)

describe('route fallbacks', () => {
  it('not found offers a way back home', () => {
    render(<NotFoundScreen />)
    expect(screen.getByText('No encontramos esa página')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Volver al inicio' }).getAttribute('href')).toBe('/')
  })

  it('error screen shows calm Spanish copy, never the raw English message', () => {
    render(<RouteErrorScreen error={new Error('Internal server error')} reset={() => {}} info={undefined} />)
    expect(screen.getByText(/Algo salió mal de nuestro lado/)).toBeTruthy()
    expect(screen.queryByText('Internal server error')).toBeNull()
    expect(screen.getByRole('link', { name: 'Volver al inicio' })).toBeTruthy()
  })
})
