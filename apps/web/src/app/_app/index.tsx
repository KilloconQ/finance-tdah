import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { LifeBuoy, PiggyBank, Plus } from 'lucide-react'
import { jarProgress } from '@finance-tdah/shared/domain'
import {
  AppBar,
  BigNumber,
  Btn,
  Card,
  EmptyState,
  Hello,
  Mini,
  Money,
  PhoneShell,
  Skeleton,
  TabBar,
} from '@/components'
import { JarWithStats, goalsQueryOptions } from '@/features/goals'
import { activeChallengeQuery, homeSummaryQuery } from '@/lib/queries'
import { queryClient } from '@/lib/query-client'
import { useTweaks } from '@/lib/use-tweaks'

export const Route = createFileRoute('/_app/')({
  loader: () => {
    void queryClient.prefetchQuery(homeSummaryQuery())
    void queryClient.prefetchQuery(goalsQueryOptions())
    void queryClient.prefetchQuery(activeChallengeQuery())
  },
  component: Home,
})

function Home() {
  const navigate = useNavigate()
  const { showBalances } = useTweaks()

  const summary = useQuery(homeSummaryQuery())
  const goals = useQuery(goalsQueryOptions())
  const challenge = useQuery(activeChallengeQuery())

  const goal = goals.data?.[0]
  const goalProgress = goal
    ? jarProgress({ currentCents: goal.currentCents, targetCents: goal.targetCents })
    : null

  const weekSpentCents = summary.data?.weekSpentCents ?? 0
  const weekTargetCents = summary.data?.weekTargetCents ?? 0
  const weekLeftCents = Math.max(0, weekTargetCents - weekSpentCents)
  const activeChallenge = challenge.data

  // Primary actions live inline on desktop; the docked bar is mobile-only.
  const quickActions = (
    <>
      <Btn kind="primary" className="flex-1" onClick={() => navigate({ to: '/add-expense' })}>
        <Plus size={16} strokeWidth={2.2} />
        Gasto
      </Btn>
      <Btn kind="ghost" className="flex-1" onClick={() => navigate({ to: '/goals' })}>
        <PiggyBank size={16} strokeWidth={2} />
        Echar al frasco
      </Btn>
    </>
  )

  return (
    <PhoneShell>
      <AppBar
        title="Hoy"
        right={
          <button
            type="button"
            onClick={() => navigate({ to: '/panic' })}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium text-ink-mid transition-colors hover:bg-danger-bg hover:text-danger"
          >
            <LifeBuoy size={15} strokeWidth={2} />
            Modo pánico
          </button>
        }
      />

      <div className="flex flex-1 flex-col gap-6 py-2 lg:grid lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-start lg:gap-10 lg:py-4">
        {/* Left: greeting + hero + week context + inline actions */}
        <div className="flex flex-col">
          {summary.data ? (
            <Hello className="text-center md:text-left">{`${summary.data.greeting} 👋`}</Hello>
          ) : (
            <Skeleton className="mx-auto h-5 w-40 md:mx-0" />
          )}

          <BigNumber
            label="Hoy puedes gastar"
            value={(summary.data?.todayAvailableCents ?? 0) / 100}
            hidden={!showBalances}
            size="md"
            className="md:px-0 md:text-left"
          />

          {summary.data ? (
            <div className="mt-2 rounded-xl border border-line bg-surface px-4 py-3 text-sm text-ink-mid shadow-card">
              <Money
                value={weekSpentCents / 100}
                hidden={!showBalances}
                weight="medium"
                className="text-ink"
              />{' '}
              esta semana · te faltan{' '}
              <Money
                value={weekLeftCents / 100}
                hidden={!showBalances}
                weight="medium"
                className="text-accent-strong"
              />
            </div>
          ) : (
            <Skeleton className="mt-2 h-12 w-full rounded-xl" />
          )}

          <div className="mt-6 hidden gap-2 md:flex">{quickActions}</div>
        </div>

        {/* Right: goal jar + mini stats */}
        <div className="flex flex-col gap-4">
          <Card className="flex items-center justify-center">
            {goal && goalProgress ? (
              <JarWithStats
                fraction={goalProgress.fraction}
                label={`${goal.emoji} ${goal.name} · meta`}
                currentCents={goal.currentCents}
                targetCents={goal.targetCents}
                hidden={!showBalances}
                width={150}
                height={190}
              />
            ) : goals.isLoading ? (
              <Skeleton className="h-[190px] w-[150px] rounded-2xl" />
            ) : (
              <EmptyState
                icon={<PiggyBank size={22} strokeWidth={1.8} />}
                title="Aún no tienes un frasco"
                hint="Crea una meta para empezar a guardar."
                action={
                  <Btn kind="primary" onClick={() => navigate({ to: '/goals' })}>
                    Crear meta
                  </Btn>
                }
              />
            )}
          </Card>

          {summary.data ? (
            <div className="flex gap-2">
              <Mini
                compact
                label="gastado"
                value={weekSpentCents / 100}
                hidden={!showBalances}
              />
              <Mini
                compact
                label="meta"
                value={weekTargetCents / 100}
                hidden={!showBalances}
              />
              {activeChallenge ? (
                <Mini
                  compact
                  label="reto"
                  value={`${activeChallenge.doneDays}/${activeChallenge.days} 🔥`}
                />
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {/* Mobile-only docked CTA */}
      <div className="flex gap-2 pt-3 pb-4 md:hidden">{quickActions}</div>

      <TabBar />
    </PhoneShell>
  )
}
