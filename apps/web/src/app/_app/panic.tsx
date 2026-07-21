import { createFileRoute, useNavigate } from '@tanstack/react-router'
import type { LinkProps } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { Card, Hello, Money } from '@/components'
import { homeSummaryQuery } from '@/lib/queries'

type AppPath = LinkProps['to']

// Honest recovery actions: each one navigates to a real place in the app that
// actually helps reduce spending. No fake savings figures.
const ACTIONS: Array<{
  id: string
  emoji: string
  title: string
  sub: string
  to: AppPath
}> = [
  {
    id: 'subs',
    emoji: '📺',
    title: 'Ver suscripciones que no usas',
    sub: 'cancela lo que ya no aporta',
    to: '/subscriptions',
  },
  {
    id: 'essential',
    emoji: '✍️',
    title: 'Registrar solo lo esencial',
    sub: 'anota lo que sí necesitas hoy',
    to: '/add-expense',
  },
  {
    id: 'reto',
    emoji: '🎯',
    title: 'Empezar un reto de ahorro',
    sub: 'un límite pequeño para esta semana',
    to: '/challenge',
  },
]

export const Route = createFileRoute('/_app/panic')({
  component: Panic,
})

function Panic() {
  const navigate = useNavigate()
  const { data: summary } = useQuery(homeSummaryQuery())

  const overspendCents = summary
    ? Math.max(0, summary.weekSpentCents - summary.weekTargetCents)
    : 0

  const close = () => navigate({ to: '/' })

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') navigate({ to: '/' })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Modo pánico"
      className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-bg-alt"
    >
      <header className="mx-auto flex w-full max-w-[480px] items-center justify-end px-6 pt-4">
        <button
          type="button"
          onClick={close}
          aria-label="Salir"
          autoFocus
          className="grid h-11 w-11 place-items-center rounded-xl text-ink-mid transition-colors hover:bg-surface hover:text-ink"
        >
          <X size={20} strokeWidth={2} />
        </button>
      </header>

      <div className="mx-auto flex w-full max-w-[480px] flex-1 flex-col px-6 pb-8">
        <div className="pt-2 pb-6 text-center">
          <div className="mb-3 text-4xl">🌬</div>
          <h1 className="text-xl font-semibold leading-tight tracking-tight text-ink">
            Respira.
            <br />
            No pasa nada grave.
          </h1>
          <Hello className="mt-3">
            {!summary ? (
              <>Veamos qué podemos hacer ahora mismo.</>
            ) : overspendCents > 0 ? (
              <>
                Te excediste por{' '}
                <Money value={overspendCents / 100} className="text-warn" /> esta semana.
                <br />
                Esto es lo que sí podemos hacer.
              </>
            ) : (
              <>
                Vas dentro de tu presupuesto esta semana.
                <br />
                Aun así, aquí tienes formas de cuidarlo.
              </>
            )}
          </Hello>
        </div>

        <div className="flex flex-col gap-2.5">
          {ACTIONS.map((a) => (
            <Card
              key={a.id}
              className="flex cursor-pointer items-center gap-3 transition-colors hover:bg-bg-alt"
              onClick={() => navigate({ to: a.to })}
            >
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent-bg text-lg">
                {a.emoji}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-ink">{a.title}</div>
                <div className="mt-0.5 text-xs text-ink-mid">{a.sub}</div>
              </div>
              <span aria-hidden className="text-lg text-ink-soft">
                ›
              </span>
            </Card>
          ))}
        </div>

        <div className="mt-8 flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={() => navigate({ to: '/transactions' })}
            className="text-sm text-ink-mid underline"
          >
            Solo quería ver el daño
          </button>
          <button
            type="button"
            onClick={close}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-line bg-surface px-6 text-sm font-medium text-ink shadow-card transition-colors hover:bg-bg-alt"
          >
            Salir
          </button>
        </div>
      </div>
    </div>
  )
}
