import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { AppBar, BigNumber, Btn, Card, PhoneShell, TabBar } from '@/components'
import { daysAgo, formatMoney } from '@/lib/format'
import { subscriptionsQuery } from '@/lib/queries'
import { queryClient } from '@/lib/query-client'
import { useTweaks } from '@/lib/use-tweaks'

export const Route = createFileRoute('/_app/subscriptions/')({
  loader: () => queryClient.ensureQueryData(subscriptionsQuery()),
  component: Subscriptions,
})

function Subscriptions() {
  const navigate = useNavigate()
  const { showBalances, density } = useTweaks()
  const detailed = density === 'detailed'

  const { data: subs = [] } = useQuery(subscriptionsQuery())
  const unused = subs.filter((s) => s.unused)
  const active = subs.filter((s) => !s.unused)

  const monthlyLossCents = unused.reduce((sum, s) => sum + s.amountCents, 0)
  const yearlyLossCents = monthlyLossCents * 12

  return (
    <PhoneShell>
      <AppBar
        title="Suscripciones"
        left={
          <button
            type="button"
            onClick={() => navigate({ to: '/' })}
            className="wf-tap text-[16px] text-ink"
          >
            ←
          </button>
        }
        right={<span className="text-[20px] text-ink-mid">+</span>}
      />

      <div className="px-6 pt-2 text-center">
        <div className="wf-mono text-[11px] uppercase tracking-[0.08em] text-ink-mid">
          Estás perdiendo al mes
        </div>
        <BigNumber
          value={monthlyLossCents / 100}
          size="sm"
          tone="danger"
          hidden={!showBalances}
        />
        {detailed ? (
          <div className="-mt-3 text-[12px] text-ink-mid">
            al año:{' '}
            <span className="wf-mono">{formatMoney(yearlyLossCents / 100, !showBalances)}</span>
          </div>
        ) : null}
      </div>

      <div className="px-5 pt-3">
        <div className="wf-mono text-[11px] uppercase tracking-[0.08em] text-ink-mid">
          {unused.length} que no usas
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-3 pt-2">
        <div className="space-y-2">
          {unused.map((sub) => {
            const days = sub.lastOpenedAt ? daysAgo(sub.lastOpenedAt) : null
            return (
              <Card key={sub.id} padded={false} className="flex items-center gap-3 px-3 py-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-danger-bg text-[13px] font-medium text-danger">
                  {sub.name[0]}
                </div>
                <button
                  type="button"
                  onClick={() => navigate({ to: '/subscriptions/$id', params: { id: sub.id } })}
                  className="wf-tap min-w-0 flex-1 text-left"
                >
                  <div className="truncate text-[14px] font-medium text-ink">{sub.name}</div>
                  <div className="mt-0.5 text-[11px] text-ink-mid">
                    {days !== null ? `hace ${days} días` : 'nunca abierto'}
                  </div>
                </button>
                <Btn
                  kind="danger"
                  className="px-3 py-2 text-[12px]"
                  onClick={() => navigate({ to: '/subscriptions/$id', params: { id: sub.id } })}
                >
                  Cancelar
                </Btn>
              </Card>
            )
          })}
        </div>

        <div className="mt-5 px-1">
          <div className="wf-mono text-[11px] uppercase tracking-[0.08em] text-ink-mid">
            Activas · {active.length}
          </div>
          <div className="mt-2 divide-y divide-line-soft rounded-xl border border-line bg-surface">
            {active.map((sub) => (
              <button
                key={sub.id}
                type="button"
                onClick={() => navigate({ to: '/subscriptions/$id', params: { id: sub.id } })}
                className="wf-tap flex w-full items-center gap-3 px-3.5 py-3 text-left"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-accent-bg text-[12px] font-medium text-accent">
                  {sub.name[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] font-medium text-ink">{sub.name}</div>
                  <div className="mt-0.5 text-[11px] text-ink-mid">{sub.category}</div>
                </div>
                <span className="wf-mono text-[13px] text-ink">
                  {formatMoney(sub.amountCents / 100, !showBalances)}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <TabBar />
    </PhoneShell>
  )
}
