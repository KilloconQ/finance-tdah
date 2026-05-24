import type { GoalDTO } from '@finance-tdah/shared/schemas'
import { jarProgress } from '@finance-tdah/shared/domain'
import { AppBar, Card, PhoneShell, TabBar } from '@/components'
import { formatMoney } from '@/lib/format'
import { Jar } from './Jar'

interface GoalListViewProps {
  goals: GoalDTO[]
  totalCents: number
  showBalances: boolean
  detailed: boolean
  onAddNew: () => void
  onSelectGoal: (id: string) => void
}

export function GoalListView({
  goals,
  totalCents,
  showBalances,
  detailed,
  onAddNew,
  onSelectGoal,
}: GoalListViewProps) {
  return (
    <PhoneShell>
      <AppBar
        title="Frascos"
        right={
          <button type="button" onClick={onAddNew} className="wf-tap text-[20px] text-ink">
            +
          </button>
        }
      />

      <div className="px-5 pb-3">
        <div className="wf-mono text-[28px] font-light text-ink">
          {showBalances ? formatMoney(totalCents / 100) : '••••'}
        </div>
        <div className="mt-1 text-[12px] text-ink-mid">
          guardado en {goals.length} {goals.length === 1 ? 'frasco' : 'frascos'}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <div className="grid grid-cols-2 gap-2.5">
          {goals.map((g) => {
            const progress = jarProgress({
              currentCents: g.currentCents,
              targetCents: g.targetCents,
            })
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => onSelectGoal(g.id)}
                className="wf-tap"
              >
                <Card className="text-center">
                  <div className="wf-mono h-3.5 text-[11px] text-ink-mid">
                    {Math.round(progress.percent)}%
                  </div>
                  <div className="mx-auto inline-block">
                    <Jar fraction={progress.fraction} width={70} height={92} />
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
