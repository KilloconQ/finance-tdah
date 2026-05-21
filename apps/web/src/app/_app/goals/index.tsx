import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { AppBar, Card, Jar, PhoneShell, TabBar } from '@/components'
import { useAppStore } from '@/store/appStore'
import { formatMoney } from '@/lib/format'
import { goalsQuery } from '@/lib/queries'
import { queryClient } from '@/lib/query-client'

export const Route = createFileRoute('/_app/goals/')({
  loader: () => queryClient.ensureQueryData(goalsQuery()),
  component: Goals,
})

function Goals() {
  const navigate = useNavigate()
  const showBalances = useAppStore((s) => s.tweaks.showBalances)
  const detailed = useAppStore((s) => s.tweaks.density === 'detailed')

  const { data: goals = [] } = useQuery(goalsQuery())
  const total = goals.reduce((sum, g) => sum + g.currentCents, 0)

  return (
    <PhoneShell>
      <AppBar
        title="Frascos"
        right={
          <button
            type="button"
            onClick={() => navigate({ to: '/goals/new' })}
            className="wf-tap text-[20px] text-ink"
          >
            +
          </button>
        }
      />

      <div className="px-5 pb-3">
        <div className="wf-mono text-[28px] font-light text-ink">
          {showBalances ? formatMoney(total / 100) : '••••'}
        </div>
        <div className="mt-1 text-[12px] text-ink-mid">
          guardado en {goals.length} {goals.length === 1 ? 'frasco' : 'frascos'}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <div className="grid grid-cols-2 gap-2.5">
          {goals.map((g) => {
            const fill = g.targetCents > 0 ? g.currentCents / g.targetCents : 0
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => navigate({ to: '/goals/$id', params: { id: g.id } })}
                className="wf-tap"
              >
                <Card className="text-center">
                  <div className="wf-mono h-3.5 text-[11px] text-ink-mid">
                    {Math.round(fill * 100)}%
                  </div>
                  <div className="mx-auto inline-block">
                    <Jar fill={fill} width={70} height={92} />
                  </div>
                  <div className="mt-1.5 text-[12px] font-medium text-ink">
                    {g.emoji} {g.name}
                  </div>
                  {detailed ? (
                    <div className="wf-mono mt-0.5 text-[10px] text-ink-mid">
                      {showBalances
                        ? `${formatMoney(g.currentCents / 100)} / ${formatMoney(g.targetCents / 100)}`
                        : '••••'}
                    </div>
                  ) : null}
                </Card>
              </button>
            )
          })}
        </div>
      </div>

      <TabBar />
    </PhoneShell>
  )
}
