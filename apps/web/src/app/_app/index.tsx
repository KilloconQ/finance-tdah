import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { jarProgress } from '@finance-tdah/shared/domain'
import { AppBar, BigNumber, Btn, Hello, Mini, PhoneShell, TabBar } from '@/components'
import { JarWithStats, goalsQueryOptions } from '@/features/goals'
import { cn } from '@/lib/cn'
import { formatMoney } from '@/lib/format'
import { homeSummaryQuery } from '@/lib/queries'
import { queryClient } from '@/lib/query-client'
import { useTweaks } from '@/lib/use-tweaks'

export const Route = createFileRoute('/_app/')({
  loader: () => {
    void queryClient.prefetchQuery(homeSummaryQuery())
    void queryClient.prefetchQuery(goalsQueryOptions())
  },
  component: Home,
})

function Home() {
  const navigate = useNavigate()
  const { showBalances, density } = useTweaks()
  const detailed = density === 'detailed'

  const summary = useQuery(homeSummaryQuery())
  const goals = useQuery(goalsQueryOptions())
  const goal = goals.data?.[0]
  const goalProgress = goal
    ? jarProgress({ currentCents: goal.currentCents, targetCents: goal.targetCents })
    : null

  return (
    <PhoneShell>
      <AppBar />

      <div className="flex flex-1 flex-col overflow-y-auto px-6 md:justify-center md:px-10 md:py-4">
        <div className="md:grid md:grid-cols-2 md:items-center md:gap-10">
          <div className="flex flex-col">
            <Hello className="mt-1 text-center md:mt-0 md:text-left">
              {summary.data ? `${summary.data.greeting} 👋` : '…'}
            </Hello>

            <BigNumber
              label="Hoy puedes gastar"
              value={(summary.data?.todayAvailableCents ?? 0) / 100}
              hidden={!showBalances}
              size="md"
            />

            {summary.data ? (
              <div
                className={cn(
                  'mt-4 rounded-[10px] border border-line bg-surface px-3.5 py-3 text-[12px] text-ink-mid',
                  detailed ? 'block' : 'hidden md:block',
                )}
              >
                <span className="wf-mono text-ink">
                  {formatMoney(summary.data.weekSpentCents / 100, !showBalances)}
                </span>{' '}
                esta semana · te faltan{' '}
                <span className="wf-mono text-ink">
                  {formatMoney(
                    Math.max(0, summary.data.weekTargetCents - summary.data.weekSpentCents) / 100,
                    !showBalances,
                  )}
                </span>
              </div>
            ) : null}
          </div>

          {goal && goalProgress ? (
            <div className="mt-3 flex justify-center md:mt-0">
              <JarWithStats
                fraction={goalProgress.fraction}
                label={`${goal.emoji} ${goal.name} · meta`}
                currentCents={goal.currentCents}
                targetCents={goal.targetCents}
                hidden={!showBalances}
                width={150}
                height={190}
              />
            </div>
          ) : null}
        </div>

        {detailed && summary.data ? (
          <div className="mt-4 grid grid-cols-3 gap-2 md:max-w-md">
            <Mini
              compact
              label="gastado"
              value={summary.data.weekSpentCents / 100}
              hidden={!showBalances}
            />
            <Mini
              compact
              label="meta"
              value={summary.data.weekTargetCents / 100}
              hidden={!showBalances}
            />
            <Mini compact label="reto" value="3/7 🔥" mono={false} />
          </div>
        ) : null}
      </div>

      <div className="flex gap-2 px-5 pt-3 pb-4">
        <Btn kind="primary" className="flex-1" onClick={() => navigate({ to: '/add-expense' })}>
          + Gasto
        </Btn>
        <Btn kind="ghost" className="flex-1" onClick={() => navigate({ to: '/goals' })}>
          Echar al frasco
        </Btn>
      </div>

      <TabBar />
    </PhoneShell>
  )
}
