import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AppBar, Btn, Card, EmptyState, Money, PhoneShell, TabBar } from '@/components'
import { daysAgo, formatMoney } from '@/lib/format'
import { mutations, subscriptionsQuery } from '@/lib/queries'
import { queryClient } from '@/lib/query-client'
import { useTweaks } from '@/lib/use-tweaks'

/** Deterministic pastel color for the initial avatar, derived from the name. */
function initialAvatarStyle(name: string): { backgroundColor: string; color: string } {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  }
  const hue = hash % 360
  return {
    backgroundColor: `hsl(${hue} 48% 91%)`,
    color: `hsl(${hue} 42% 34%)`,
  }
}

export const Route = createFileRoute('/_app/subscriptions/$id')({
  loader: () => queryClient.ensureQueryData(subscriptionsQuery()),
  component: SubscriptionDetail,
})

function SubscriptionDetail() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { showBalances } = useTweaks()
  const { data: subs = [] } = useQuery(subscriptionsQuery())
  const sub = subs.find((x) => x.id === id)

  const goBack = () => navigate({ to: '/subscriptions' })

  const cancelMutation = useMutation({
    mutationFn: () => mutations.cancelSubscription(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['subscriptions'] })
      navigate({ to: '/subscriptions', replace: true })
    },
  })

  const pauseMutation = useMutation({
    mutationFn: () => mutations.pauseSubscription(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['subscriptions'] })
    },
  })

  if (!sub) {
    return (
      <PhoneShell>
        <AppBar title="Suscripción" back onBack={goBack} />
        <EmptyState
          className="flex-1"
          title="No encontramos esa suscripción"
          hint="Puede que la hayas cancelado o que el enlace esté roto."
          action={
            <Btn kind="ghost" onClick={goBack}>
              Volver a suscripciones
            </Btn>
          }
        />
        <TabBar />
      </PhoneShell>
    )
  }

  const days = sub.lastOpenedAt ? daysAgo(sub.lastOpenedAt) : null
  const totalPaidCents = days ? Math.round((days / 30) * sub.amountCents) : null

  return (
    <PhoneShell>
      <AppBar title={sub.name} back onBack={goBack} />

      <div className="flex-1 pb-4">
        <div className="max-w-lg space-y-4">
          <div className="flex items-center gap-4">
            <span
              style={initialAvatarStyle(sub.name)}
              className="inline-flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-2xl font-semibold"
              aria-hidden
            >
              {sub.name[0]?.toUpperCase() ?? '?'}
            </span>
            <div>
              <div className="text-lg font-semibold tracking-tight text-ink">{sub.name}</div>
              <div className="money text-2xl font-semibold tracking-tight text-ink">
                {formatMoney(sub.amountCents / 100, !showBalances)}
                <span className="text-sm font-normal text-ink-mid">
                  {' '}
                  / {sub.cadence === 'monthly' ? 'mes' : 'año'}
                </span>
              </div>
            </div>
          </div>

          {sub.unused && days !== null ? (
            <Card className="border-danger/40 bg-danger-bg/40">
              <div className="text-sm font-medium text-danger">No la abres hace {days} días</div>
              {totalPaidCents && showBalances ? (
                <div className="mt-1.5 text-sm leading-relaxed text-ink-mid">
                  Llevas <Money value={totalPaidCents / 100} className="text-ink" /> pagados desde la
                  última vez que la usaste.
                </div>
              ) : null}
            </Card>
          ) : (
            <Card>
              <div className="text-sm text-ink-mid">
                {days !== null
                  ? `La usaste hace ${days} días.`
                  : 'No tenemos registro de uso aún.'}
              </div>
              <div className="mt-2 text-sm text-ink-mid">
                Próximo cobro:{' '}
                <span className="money text-ink">
                  {new Date(sub.nextChargeAt).toLocaleDateString('es-MX', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </span>
              </div>
            </Card>
          )}

          <div className="flex flex-col gap-2">
            <Btn
              kind="danger"
              onClick={() => cancelMutation.mutate()}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? 'Cancelando…' : 'Cancelar suscripción'}
            </Btn>
            <Btn
              kind="ghost"
              onClick={() => pauseMutation.mutate()}
              disabled={pauseMutation.isPending}
            >
              {pauseMutation.isPending ? 'Pausando…' : 'Pausar 1 mes'}
            </Btn>
            <Btn kind="plain" onClick={goBack}>
              La sigo necesitando
            </Btn>
          </div>
        </div>
      </div>
      <TabBar />
    </PhoneShell>
  )
}
