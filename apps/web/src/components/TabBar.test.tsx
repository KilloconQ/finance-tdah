import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const router = vi.hoisted(() => ({ pathname: '/' }))
vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, ...rest }: { to: string } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={to} {...rest} />
  ),
  useRouterState: ({ select }: { select: (s: { location: { pathname: string } }) => string }) =>
    select({ location: { pathname: router.pathname } }),
}))

const { TabBar } = await import('./TabBar')
const { Sidebar } = await import('./Sidebar')

afterEach(cleanup)

const renderAt = (pathname: string, ui: React.ReactElement) => {
  router.pathname = pathname
  return render(ui)
}
const labels = (nav: HTMLElement) =>
  Array.from(nav.querySelectorAll('a')).map((a) => a.textContent)
const current = () => screen.getAllByRole('link').filter((a) => a.getAttribute('aria-current') === 'page')

describe('TabBar (mobile)', () => {
  it('shows four tabs: Hoy, Movimientos, Dinero, Grupos', () => {
    renderAt('/', <TabBar />)
    expect(labels(screen.getByRole('navigation'))).toEqual(['Hoy', 'Movimientos', 'Dinero', 'Grupos'])
    expect(screen.getByRole('link', { name: 'Dinero' }).getAttribute('href')).toBe('/money')
  })

  it.each(['/money', '/accounts', '/accounts/abc', '/goals/abc', '/subscriptions'])(
    'marks Dinero as the current tab on %s',
    (path) => {
      renderAt(path, <TabBar />)
      expect(current().map((a) => a.textContent)).toEqual(['Dinero'])
    },
  )

  it('marks Hoy only on the home screen', () => {
    renderAt('/', <TabBar />)
    expect(current().map((a) => a.textContent)).toEqual(['Hoy'])
    cleanup()
    renderAt('/groups/abc', <TabBar />)
    expect(current().map((a) => a.textContent)).toEqual(['Grupos'])
  })

  it('keeps inactive labels readable (ink-mid, not ink-soft)', () => {
    renderAt('/', <TabBar />)
    const inactive = screen.getByRole('link', { name: 'Grupos' })
    expect(inactive.className).toContain('text-ink-mid')
    expect(inactive.className).not.toContain('text-ink-soft')
  })
})

describe('Sidebar (desktop)', () => {
  it('keeps its entries and does not gain Dinero', () => {
    renderAt('/', <Sidebar />)
    expect(labels(screen.getByRole('navigation'))).toEqual([
      'Hoy',
      'Movimientos',
      'Suscrip.',
      'Cuentas',
      'Grupos',
      'Retos',
    ])
  })
})
