import { Pencil } from 'lucide-react'
import type { GoalDTO } from '@finance-tdah/shared/schemas'
import type { JarPace, JarProgress } from '@finance-tdah/shared/domain'
import { centsToUnits } from '@finance-tdah/shared/domain'
import { AppBar, Btn, Card, IconButton, Money, PhoneShell, TabBar } from '@/components'
import { cn } from '@/lib/cn'
import { formatMoney } from '@/lib/format'
import { JarWithStats } from './JarWithStats'

interface GoalDetailViewProps {
  goal: GoalDTO
  progress: JarProgress
  pace: JarPace | null
  presetAmounts: number[]
  selectedAmount: number
  isCustom: boolean
  customAmount: string
  showBalances: boolean
  confirming: boolean
  confirmedAmountCents: number | null
  isAdding: boolean
  canAdd: boolean
  deleteConfirm: boolean
  isDeleting: boolean
  deleted: boolean
  onBack: () => void
  onEdit: () => void
  onSelectAmount: (amount: number) => void
  onSelectCustom: () => void
  onCustomAmountChange: (value: string) => void
  onAdd: () => void
  onRequestDelete: () => void
  onCancelDelete: () => void
  onConfirmDelete: () => void
}

export function GoalDetailView({
  goal,
  progress,
  pace,
  presetAmounts,
  selectedAmount,
  isCustom,
  customAmount,
  showBalances,
  confirming,
  confirmedAmountCents,
  isAdding,
  canAdd,
  deleteConfirm,
  isDeleting,
  deleted,
  onBack,
  onEdit,
  onSelectAmount,
  onSelectCustom,
  onCustomAmountChange,
  onAdd,
  onRequestDelete,
  onCancelDelete,
  onConfirmDelete,
}: GoalDetailViewProps) {
  return (
    <PhoneShell>
      <AppBar
        title="Mi frasco"
        back
        onBack={onBack}
        right={
          <IconButton onClick={onEdit} label="Editar">
            <Pencil size={20} strokeWidth={2} />
          </IconButton>
        }
      />

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
            <div className="grid grid-cols-4 gap-2">
              {presetAmounts.map((amount) => (
                <button
                  key={amount}
                  type="button"
                  onClick={() => onSelectAmount(amount)}
                  className={cn(
                    'wf-tap rounded-xl border px-1 py-3 text-sm font-medium transition-colors',
                    !isCustom && selectedAmount === amount
                      ? 'border-accent bg-accent text-surface'
                      : 'border-line bg-surface text-ink hover:bg-bg-alt',
                  )}
                >
                  {formatMoney(amount)}
                </button>
              ))}
              <button
                type="button"
                onClick={onSelectCustom}
                className={cn(
                  'wf-tap rounded-xl border px-1 py-3 text-sm font-medium transition-colors',
                  isCustom
                    ? 'border-accent bg-accent text-surface'
                    : 'border-line bg-surface text-ink hover:bg-bg-alt',
                )}
              >
                Otra
              </button>
            </div>
            {isCustom ? (
              <div className="flex items-baseline gap-1.5 border-b border-line pb-2 focus-within:border-accent">
                <span className="money text-2xl font-medium text-ink">$</span>
                <input
                  inputMode="decimal"
                  autoComplete="off"
                  autoFocus
                  value={customAmount}
                  onChange={(e) => onCustomAmountChange(e.target.value)}
                  placeholder="0"
                  className="money money-lg w-full bg-transparent text-3xl font-semibold leading-none tracking-tight text-ink caret-accent outline-none placeholder:font-normal placeholder:text-ink-soft"
                />
              </div>
            ) : null}
            <Btn kind="primary" onClick={onAdd} disabled={isAdding || !canAdd}>
              {isAdding ? 'Guardando…' : `Echar ${formatMoney(selectedAmount)}`}
            </Btn>
            {confirming ? (
              <div className="text-center text-sm text-good">
                ✓ {formatMoney(centsToUnits(confirmedAmountCents ?? 0))} guardados al frasco
              </div>
            ) : null}
          </Card>
        </div>

        <div className="mx-auto mt-6 max-w-3xl">
          {!deleteConfirm ? (
            <Btn kind="plain" className="w-full" onClick={onRequestDelete}>
              Borrar frasco
            </Btn>
          ) : (
            <div className="rounded-xl border border-danger bg-danger-bg p-4">
              {deleted ? (
                <div className="text-center text-sm text-good">✓ Frasco borrado</div>
              ) : (
                <>
                  <div className="mb-3 text-sm font-medium text-danger">¿Estás seguro?</div>
                  <div className="mb-4 text-xs text-ink-soft">Esta acción no se puede deshacer.</div>
                  <div className="flex gap-2">
                    <Btn kind="ghost" className="flex-1" onClick={onCancelDelete}>
                      Cancelar
                    </Btn>
                    <Btn
                      kind="danger"
                      className="flex-1"
                      onClick={onConfirmDelete}
                      disabled={isDeleting}
                    >
                      {isDeleting ? 'Borrando...' : 'Confirmar'}
                    </Btn>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <TabBar />
    </PhoneShell>
  )
}
