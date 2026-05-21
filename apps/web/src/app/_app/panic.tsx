import { createFileRoute, useNavigate } from '@tanstack/react-router'
import type { LinkProps } from '@tanstack/react-router'
import { AppBar, Card, Hello, PhoneShell } from '@/components'

type AppPath = LinkProps['to']

const ACTIONS: Array<{
  id: string
  emoji: string
  title: string
  sub: string
  to: AppPath
}> = [
  { id: 'subs', emoji: '⏸', title: 'Pausar 2 subs sin uso', sub: 'recuperas $228 / mes', to: '/subscriptions' },
  { id: 'reto', emoji: '🍔', title: 'Reto de 5 días sin delivery', sub: 'ahorras ~$600', to: '/challenge' },
  { id: 'alerta', emoji: '🔔', title: 'Activar alerta de gasto diario', sub: 'te aviso si te pasas', to: '/' },
]

export const Route = createFileRoute('/_app/panic')({
  component: Panic,
})

function Panic() {
  const navigate = useNavigate()
  return (
    <PhoneShell bg="bg-alt">
      <AppBar
        left={
          <button
            type="button"
            onClick={() => navigate({ to: '..' })}
            className="wf-tap text-[16px] text-ink"
          >
            ✕
          </button>
        }
      />

      <div className="flex flex-1 flex-col px-7">
        <div className="py-1 pb-5 text-center">
          <div className="mb-3 text-[36px]">🌬</div>
          <h1 className="text-[22px] font-medium leading-tight text-ink">
            Respira.
            <br />
            No pasa nada grave.
          </h1>
          <Hello className="mt-3">
            Te excediste por <span className="wf-mono text-warn">$840</span> esta semana.
            <br />
            Esto es lo que sí podemos hacer.
          </Hello>
        </div>

        <div className="flex flex-col gap-2.5">
          {ACTIONS.map((a) => (
            <Card
              key={a.id}
              className="flex cursor-pointer items-center gap-3"
              onClick={() => navigate({ to: a.to })}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-good-bg text-[18px]">
                {a.emoji}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-medium text-ink">{a.title}</div>
                <div className="mt-0.5 text-[12px] text-ink-mid">{a.sub}</div>
              </div>
              <span aria-hidden className="text-[18px] text-ink-soft">
                ›
              </span>
            </Card>
          ))}
        </div>

        <div className="flex-1" />

        <div className="pb-4 text-center text-[12px] text-ink-mid">
          <button
            type="button"
            onClick={() => navigate({ to: '/transactions' })}
            className="wf-tap underline"
          >
            Solo quería ver el daño
          </button>
        </div>
      </div>
    </PhoneShell>
  )
}
