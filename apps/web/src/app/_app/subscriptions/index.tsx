import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Plus, Repeat } from 'lucide-react'
import { AppBar, Btn, Card, EmptyState, IconButton, Money, PhoneShell, Skeleton, TabBar } from '@/components'
import { daysAgo } from '@/lib/format'
import { subscriptionsQuery } from '@/lib/queries'
import { queryClient } from '@/lib/query-client'
import { useTweaks } from '@/lib/use-tweaks'

/**
 * Deterministic pastel color for a subscription's initial avatar, derived from
 * its name so different services read as visually distinct (Apple TV+ ≠ Audible).
 */
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

export const Route = createFileRoute('/_app/subscriptions/')({
  loader: () => queryClient.ensureQueryData(subscriptionsQuery()),
  component: Subscriptions,
})

function Subscriptions() {
  const navigate = useNavigate()
  const { showBalances } = useTweaks()

  const { data: subs = [], isLoading } = useQuery(subscriptionsQuery())
  const unused = subs.filter((s) => s.unused)
  const active = subs.filter((s) => !s.unused)

  const monthlyLossCents = unused.reduce((sum, s) => sum + s.amountCents, 0)
  const yearlyLossCents = monthlyLossCents * 12

  const goNew = () => navigate({ to: '/subscriptions/new' })

  return (
    <PhoneShell>
      <AppBar
        title="Suscripciones"
        right={
          <IconButton onClick={goNew} label="Nueva suscripción">
            <Plus size={20} strokeWidth={2} />
          </IconButton>
        }
      />

      {isLoading ? (
        <SubscriptionsSkeleton />
      ) : subs.length === 0 ? (
        <EmptyState
          className="flex-1"
          icon={<Repeat size={22} strokeWidth={1.8} />}
          title="Aún no sigues ninguna suscripción"
          hint="Agrega las que pagas cada mes y detecta las que ya no usas."
          action={
            <Btn kind="primary" onClick={goNew}>
              Agregar suscripción
            </Btn>
          }
        />
      ) : (
        <div className="flex-1 pb-4">
          <div className="max-w-2xl space-y-6">
            {unused.length > 0 ? (
              <section>
                <div className="text-sm font-medium text-ink-mid">Estás perdiendo al mes</div>
                <div className="mt-1 money text-4xl font-semibold tracking-tight text-danger">
                  {showBalances ? <Money value={monthlyLossCents / 100} weight="semibold" /> : '••••'}
                </div>
                {showBalances ? (
                  <div className="mt-1 text-sm text-ink-mid">
                    Al año: <Money value={yearlyLossCents / 100} className="text-ink" />
                  </div>
                ) : null}
              </section>
            ) : null}

            {unused.length > 0 ? (
              <section>
                <div className="pb-2 text-sm font-medium text-accent-strong">
                  {unused.length} que no usas
                </div>
                <div className="space-y-2">
                  {unused.map((sub) => {
                    const days = sub.lastOpenedAt ? daysAgo(sub.lastOpenedAt) : null
                    return (
                      <Card key={sub.id} padded={false} className="flex items-center gap-3 p-3">
                        <span
                          style={initialAvatarStyle(sub.name)}
                          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
                          aria-hidden
                        >
                          {sub.name[0]?.toUpperCase() ?? '?'}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            navigate({ to: '/subscriptions/$id', params: { id: sub.id } })
                          }
                          className="wf-tap min-w-0 flex-1 text-left"
                        >
                          <div className="truncate text-sm font-medium text-ink">{sub.name}</div>
                          <div className="mt-0.5 text-xs text-ink-mid">
                            {days !== null ? `hace ${days} días` : 'nunca abierto'}
                          </div>
                        </button>
                        <Money
                          value={sub.amountCents / 100}
                          hidden={!showBalances}
                          className="hidden text-sm text-ink sm:block"
                        />
                        <Btn
                          kind="danger"
                          className="h-9 px-3 text-xs"
                          onClick={() =>
                            navigate({ to: '/subscriptions/$id', params: { id: sub.id } })
                          }
                        >
                          Cancelar
                        </Btn>
                      </Card>
                    )
                  })}
                </div>
              </section>
            ) : null}

            <section>
              <div className="pb-2 text-sm font-medium text-ink-mid">Activas · {active.length}</div>
              <div className="divide-y divide-line-soft overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
                {active.map((sub) => (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => navigate({ to: '/subscriptions/$id', params: { id: sub.id } })}
                    className="wf-tap flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-bg-alt"
                  >
                    <span
                      style={initialAvatarStyle(sub.name)}
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold"
                      aria-hidden
                    >
                      {sub.name[0]?.toUpperCase() ?? '?'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-ink">{sub.name}</div>
                      <div className="mt-0.5 text-xs text-ink-mid">{sub.category}</div>
                    </div>
                    <Money
                      value={sub.amountCents / 100}
                      hidden={!showBalances}
                      className="text-sm text-ink"
                    />
                  </button>
                ))}
                {active.length === 0 ? (
                  <div className="px-4 py-6 text-center text-sm text-ink-mid">
                    No tienes suscripciones activas.
                  </div>
                ) : null}
              </div>
            </section>
          </div>
        </div>
      )}

      <TabBar />
    </PhoneShell>
  )
}

function SubscriptionsSkeleton() {
  return (
    <div className="flex-1 pb-4">
      <div className="max-w-2xl space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-10 w-48" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3"
            >
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-8 w-16 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
