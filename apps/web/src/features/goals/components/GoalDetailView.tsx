import type { GoalDTO } from '@finance-tdah/shared/schemas'
import type { JarPace, JarProgress } from '@finance-tdah/shared/domain'
import { AppBar, Btn, Card, Money, PhoneShell, TabBar } from '@/components'
import { cn } from '@/lib/cn'
import { formatMoney } from '@/lib/format'
import { JarWithStats } from './JarWithStats'

interface GoalDetailViewProps {
  goal: GoalDTO
  progress: JarProgress
  pace: JarPace | null
  presetAmounts: number[]
  selectedAmount: number
  showBalances: boolean
  confirming: boolean
  isAdding: boolean
  onBack: () => void
  onSelectAmount: (amount: number) => void
  onAdd: () => void
}

export function GoalDetailView({
  goal,
  progress,
  pace,
  presetAmounts,
  selectedAmount,
  showBalances,
  confirming,
  isAdding,
  onBack,
  onSelectAmount,
  onAdd,
}: GoalDetailViewProps) {
  return (
    <PhoneShell>
      <AppBar title="Mi frasco" back onBack={onBack} />

      <div className="flex-1 pb-4">
        <div className="mx-auto grid max-w-3xl gap-6 md:grid-cols-2 md:items-start">
          <Card className="flex flex-col items-center">
            <div className="text-center">
              <div className="text-base font-medium text-ink">
                {goal.emoji} {goal.name}
              </div>
              {goal.deadline ? (
                <div className="mt-0.5 text-xs text-ink-soft">
                  {new Date(goal.deadline).toLocaleDateString('es-MX', {
                    day: 'numeric',
                    month: 'short',
                  })}
                  {pace ? ` · faltan ${pace.daysRemaining} días` : null}
                </div>
              ) : null}
            </div>

            <div className="mt-4">
              <JarWithStats
                fraction={progress.fraction}
                currentCents={goal.currentCents}
                targetCents={goal.targetCents}
                hidden={!showBalances}
                width={180}
                height={240}
              />
            </div>

            {pace && pace.status === 'ahead' && showBalances ? (
              <div className="mt-3 text-center text-sm text-good">
                ● vas adelantada por <Money value={pace.diffCents / 100} className="text-good" />
              </div>
            ) : null}

            {pace && pace.status === 'behind' && showBalances ? (
              <div className="mt-3 text-center text-sm text-warn">
                ● te faltan <Money value={Math.abs(pace.diffCents) / 100} className="text-warn" />{' '}
                para ir al día
              </div>
            ) : null}
          </Card>

          <Card className="flex flex-col gap-3">
            <div className="text-sm font-medium text-ink-mid">Echar al frasco</div>
            <div className="grid grid-cols-3 gap-2">
              {presetAmounts.map((amount) => (
                <button
                  key={amount}
                  type="button"
                  onClick={() => onSelectAmount(amount)}
                  className={cn(
                    'wf-tap rounded-xl border px-1 py-3 text-sm font-medium transition-colors',
                    selectedAmount === amount
                      ? 'border-accent bg-accent text-surface'
                      : 'border-line bg-surface text-ink hover:bg-bg-alt',
                  )}
                >
                  {formatMoney(amount)}
                </button>
              ))}
            </div>
            <Btn kind="primary" onClick={onAdd} disabled={isAdding}>
              {isAdding ? 'Guardando…' : `Echar ${formatMoney(selectedAmount)}`}
            </Btn>
            {confirming ? (
              <div className="text-center text-sm text-good">
                ✓ {formatMoney(selectedAmount)} guardados al frasco
              </div>
            ) : null}
          </Card>
        </div>
      </div>

      <TabBar />
    </PhoneShell>
  )
}
