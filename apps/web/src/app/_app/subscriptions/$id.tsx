import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AppBar, Btn, Card, PhoneShell, TabBar } from '@/components'
import { useAppStore } from '@/store/appStore'
import { daysAgo, formatMoney } from '@/lib/format'
import { mutations, subscriptionsQuery } from '@/lib/queries'
import { queryClient } from '@/lib/query-client'

export const Route = createFileRoute('/_app/subscriptions/$id')({
  loader: () => queryClient.ensureQueryData(subscriptionsQuery()),
  component: SubscriptionDetail,
})

function SubscriptionDetail() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const showBalances = useAppStore((s) => s.tweaks.showBalances)
  const { data: subs = [] } = useQuery(subscriptionsQuery())
  const sub = subs.find((x) => x.id === id)

  const cancelMutation = useMutation({
    mutationFn: () => mutations.cancelSubscription(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['subscriptions'] })
      navigate({ to: '/subscriptions', replace: true })
    },
  })

  if (!sub) {
    return (
      <PhoneShell>
        <AppBar
          title="Suscripción"
          left={
            <button
              type="button"
              onClick={() => navigate({ to: '..' })}
              className="wf-tap text-[16px] text-ink"
            >
              ←
            </button>
          }
        />
        <div className="flex flex-1 items-center justify-center text-[14px] text-ink-mid">
          No encontramos esa suscripción.
        </div>
        <TabBar />
      </PhoneShell>
    )
  }

  const days = sub.lastOpenedAt ? daysAgo(sub.lastOpenedAt) : null
  const totalPaidCents = days ? Math.round((days / 30) * sub.amountCents) : null

  return (
    <PhoneShell>
      <AppBar
        title={sub.name}
        left={
          <button
            type="button"
            onClick={() => navigate({ to: '..' })}
            className="wf-tap text-[16px] text-ink"
          >
            ←
          </button>
        }
        right={<span className="text-[16px] text-ink-mid">⋯</span>}
      />

      <div className="flex flex-1 flex-col overflow-y-auto px-6 pb-4">
        <div className="py-2 text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-danger-bg text-[28px] font-medium text-danger">
            {sub.name[0]}
          </div>
          <div className="wf-mono text-[36px] font-light tracking-[-0.02em] text-ink">
            {formatMoney(sub.amountCents / 100, !showBalances)}
            <span className="text-[13px] text-ink-mid">
              {' '}/ {sub.cadence === 'monthly' ? 'mes' : 'año'}
            </span>
          </div>
        </div>

        {sub.unused && days !== null ? (
          <Card className="border-danger/40 bg-danger-bg/40">
            <div className="text-[13px] font-medium text-danger">
              No la abres hace {days} días
            </div>
            {totalPaidCents && showBalances ? (
              <div className="mt-1.5 text-[12px] leading-relaxed text-ink-mid">
                Llevas{' '}
                <span className="wf-mono text-ink">{formatMoney(totalPaidCents / 100)}</span>{' '}
                pagados desde la última vez que la usaste.
              </div>
            ) : null}
          </Card>
        ) : (
          <Card>
            <div className="text-[13px] text-ink-mid">
              {days !== null ? `La usaste hace ${days} días.` : 'No tenemos registro de uso aún.'}
            </div>
            <div className="mt-2 text-[12px] text-ink-mid">
              Próximo cobro:{' '}
              <span className="wf-mono text-ink">
                {new Date(sub.nextChargeAt).toLocaleDateString('es-MX', {
                  day: 'numeric',
                  month: 'short',
                })}
              </span>
            </div>
          </Card>
        )}

        <div className="mt-4 flex flex-col gap-2">
          <Btn
            kind="primary"
            onClick={() => cancelMutation.mutate()}
            disabled={cancelMutation.isPending}
          >
            {cancelMutation.isPending ? 'Cancelando…' : 'Cancelar suscripción'}
          </Btn>
          <Btn kind="ghost">Pausar 1 mes</Btn>
          <Btn kind="plain" onClick={() => navigate({ to: '..' })}>
            La sigo necesitando
          </Btn>
        </div>
      </div>
      <TabBar />
    </PhoneShell>
  )
}
