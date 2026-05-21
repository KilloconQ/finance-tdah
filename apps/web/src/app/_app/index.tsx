import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { AppBar, BigNumber, Btn, Hello, Jar, Mini, PhoneShell, TabBar } from '@/components'
import { useAppStore } from '@/store/appStore'
import { formatMoney } from '@/lib/format'
import { goalsQuery, homeSummaryQuery } from '@/lib/queries'
import { queryClient } from '@/lib/query-client'

export const Route = createFileRoute('/_app/')({
  loader: () => {
    void queryClient.prefetchQuery(homeSummaryQuery())
    void queryClient.prefetchQuery(goalsQuery())
  },
  component: Home,
})

function Home() {
  const navigate = useNavigate()
  const showBalances = useAppStore((s) => s.tweaks.showBalances)
  const detailed = useAppStore((s) => s.tweaks.density === 'detailed')

  const summary = useQuery(homeSummaryQuery())
  const goals = useQuery(goalsQuery())
  const goal = goals.data?.[0]
  const goalFill = goal && goal.targetCents > 0 ? goal.currentCents / goal.targetCents : 0

  return (
    <PhoneShell>
      <AppBar
        right={
          <button
            type="button"
            onClick={() => navigate({ to: '/wrapped' })}
            className="wf-tap text-[12px] text-ink-mid"
          >
            wrapped ↗
          </button>
        }
      />

      <div className="flex flex-1 flex-col overflow-y-auto px-6">
        <Hello className="mt-1 text-center">
          {summary.data ? `${summary.data.greeting} 👋` : '…'}
        </Hello>

        <BigNumber
          label="Hoy puedes gastar"
          value={(summary.data?.todayAvailableCents ?? 0) / 100}
          hidden={!showBalances}
          size="md"
        />

        {goal ? (
          <div className="mt-1 flex justify-center">
            <Jar
              fill={goalFill}
              label={`${goal.emoji} ${goal.name} · meta`}
              current={goal.currentCents / 100}
              target={goal.targetCents / 100}
              hidden={!showBalances}
              width={150}
              height={190}
            />
          </div>
        ) : null}

        {detailed && summary.data ? (
          <div className="mt-4 rounded-[10px] border border-line bg-surface px-3.5 py-3 text-[12px] text-ink-mid">
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

        {detailed && summary.data ? (
          <div className="mt-4 grid grid-cols-3 gap-2">
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
