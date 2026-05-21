import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AppBar, Btn, Jar, PhoneShell, TabBar } from '@/components'
import { useAppStore } from '@/store/appStore'
import { cn } from '@/lib/cn'
import { formatMoney } from '@/lib/format'
import { goalQuery, mutations } from '@/lib/queries'
import { queryClient } from '@/lib/query-client'

const PRESET_AMOUNTS = [50, 100, 250]

export const Route = createFileRoute('/_app/goals/$id')({
  loader: ({ params }) =>
    queryClient.ensureQueryData(goalQuery(params.id)),
  component: GoalDetail,
})

function GoalDetail() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const showBalances = useAppStore((s) => s.tweaks.showBalances)
  const { data: goal } = useQuery(goalQuery(id))
  const [selected, setSelected] = useState<number>(100)
  const [confirming, setConfirming] = useState(false)

  const addMutation = useMutation({
    mutationFn: (amountCents: number) => mutations.addToGoal(id, amountCents),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['goals'] })
      setConfirming(true)
      setTimeout(() => setConfirming(false), 1400)
    },
  })

  if (!goal) {
    return (
      <PhoneShell>
        <AppBar
          title="Frasco"
          left={
            <button
              type="button"
              onClick={() => navigate({ to: '..' })}
              className="wf-tap text-[16px] text-ink"
            >
              ←
            </button>
          }
        />
        <div className="flex flex-1 items-center justify-center text-[14px] text-ink-mid">
          No encontramos ese frasco.
        </div>
        <TabBar />
      </PhoneShell>
    )
  }

  const fill = goal.targetCents > 0 ? goal.currentCents / goal.targetCents : 0
  const ahead = goal.currentCents - goal.targetCents * 0.5
  const handleAdd = () => addMutation.mutate(selected * 100)

  return (
    <PhoneShell>
      <AppBar
        title="Mi frasco"
        left={
          <button
            type="button"
            onClick={() => navigate({ to: '..' })}
            className="wf-tap text-[16px] text-ink"
          >
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
              {new Date(goal.deadline).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
            </div>
          ) : null}
        </div>

        <div className="mt-1 flex justify-center">
          <Jar
            fill={fill}
            current={goal.currentCents / 100}
            target={goal.targetCents / 100}
            hidden={!showBalances}
            width={180}
            height={240}
          />
        </div>

        {ahead > 0 && showBalances ? (
          <div className="mt-3 text-center text-[13px] text-good">
            ● vas adelantada por <span className="wf-mono">{formatMoney(ahead / 100)}</span>
          </div>
        ) : null}

        {confirming ? (
          <div className="mt-4 text-center text-[12px] text-good">
            ✓ {formatMoney(selected)} guardados al frasco
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-2 px-5 pb-4">
        <div className="wf-mono text-center text-[11px] uppercase tracking-[0.08em] text-ink-mid">
          Echar al frasco
        </div>
        <div className="flex gap-2">
          {PRESET_AMOUNTS.map((amount) => (
            <button
              key={amount}
              type="button"
              onClick={() => setSelected(amount)}
              className={cn(
                'wf-tap flex-1 rounded-[10px] border px-1 py-3 text-[13px] font-medium',
                selected === amount
                  ? 'border-ink bg-ink text-surface'
                  : 'border-line bg-surface text-ink',
              )}
            >
              {formatMoney(amount)}
            </button>
          ))}
          <Btn kind="ghost" className="flex-1" onClick={handleAdd} disabled={addMutation.isPending}>
            {addMutation.isPending ? '…' : '＋ Echar'}
          </Btn>
        </div>
      </div>

      <TabBar />
    </PhoneShell>
  )
}
