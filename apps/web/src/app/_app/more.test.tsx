import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (opts: unknown) => ({ options: opts }),
  Link: ({ to, children, ...rest }: { to: string; children: React.ReactNode }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}))
vi.mock('@/components/TabBar', () => ({ TabBar: () => null }))

const { Route } = await import('./more')
const More = (Route as unknown as { options: { component: () => React.ReactElement } }).options.component

afterEach(cleanup)

describe('More', () => {
  it('links to the screens that left the tab bar', () => {
    render(<More />)
    expect(screen.getByRole('link', { name: /Suscripciones/ }).getAttribute('href')).toBe('/subscriptions')
    expect(screen.getByRole('link', { name: /Retos/ }).getAttribute('href')).toBe('/challenge')
    expect(screen.getByRole('link', { name: /Ajustes/ }).getAttribute('href')).toBe('/settings')
  })
})
