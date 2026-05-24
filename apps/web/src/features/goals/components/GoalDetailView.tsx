import type { GoalDTO } from '@finance-tdah/shared/schemas'
import type { JarPace, JarProgress } from '@finance-tdah/shared/domain'
import { AppBar, Btn, PhoneShell, TabBar } from '@/components'
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
      <AppBar
        title="Mi frasco"
        left={
          <button type="button" onClick={onBack} className="wf-tap text-[16px] text-ink">
            ←
          </button>
        }
        right={<span className="text-[16px] text-ink-mid">⋯</span>}
      />

      <div className="flex flex-1 flex-col overflow-y-auto px-6">
        <div className="py-1 text-center">
          <div className="text-[13px] text-ink-mid">
            {goal.emoji} {goal.name}
          </div>
          {goal.deadline ? (
            <div className="wf-mono mt-0.5 text-[11px] text-ink-soft">
              {new Date(goal.deadline).toLocaleDateString('es-MX', {
                day: 'numeric',
                month: 'short',
              })}
              {pace ? ` · faltan ${pace.daysRemaining} días` : null}
            </div>
          ) : null}
        </div>

        <div className="mt-1 flex justify-center">
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
          <div className="mt-3 text-center text-[13px] text-good">
            ● vas adelantada por{' '}
            <span className="wf-mono">{formatMoney(pace.diffCents / 100)}</span>
          </div>
        ) : null}

        {pace && pace.status === 'behind' && showBalances ? (
          <div className="mt-3 text-center text-[13px] text-warn">
            ● te faltan{' '}
            <span className="wf-mono">{formatMoney(Math.abs(pace.diffCents) / 100)}</span> para ir
            al día
          </div>
        ) : null}

        {confirming ? (
          <div className="mt-4 text-center text-[12px] text-good">
            ✓ {formatMoney(selectedAmount)} guardados al frasco
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-2 px-5 pb-4">
        <div className="wf-mono text-center text-[11px] uppercase tracking-[0.08em] text-ink-mid">
          Echar al frasco
        </div>
        <div className="flex gap-2">
          {presetAmounts.map((amount) => (
            <button
              key={amount}
              type="button"
              onClick={() => onSelectAmount(amount)}
              className={cn(
                'wf-tap flex-1 rounded-[10px] border px-1 py-3 text-[13px] font-medium',
                selectedAmount === amount
                  ? 'border-ink bg-ink text-surface'
                  : 'border-line bg-surface text-ink',
              )}
            >
              {formatMoney(amount)}
            </button>
          ))}
          <Btn kind="ghost" className="flex-1" onClick={onAdd} disabled={isAdding}>
            {isAdding ? '…' : '＋ Echar'}
          </Btn>
        </div>
      </div>

      <TabBar />
    </PhoneShell>
  )
}
