import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { jarPace, jarProgress, unitsToCents } from '@finance-tdah/shared/domain'
import { AppBar, PhoneShell, TabBar } from '@/components'
import { useTweaks } from '@/lib/use-tweaks'
import { goalQueryOptions, useAddToGoal } from '../api'
import { GoalDetailView } from '../components/GoalDetailView'

const PRESET_AMOUNTS = [50, 100, 250]

interface GoalDetailContainerProps {
  goalId: string
}

export function GoalDetailContainer({ goalId }: GoalDetailContainerProps) {
  const navigate = useNavigate()
  const { showBalances } = useTweaks()
  const { data: goal } = useQuery(goalQueryOptions(goalId))
  const addMutation = useAddToGoal(goalId)
  const [selected, setSelected] = useState<number>(100)
  const [confirming, setConfirming] = useState(false)

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

  const progress = jarProgress({
    currentCents: goal.currentCents,
    targetCents: goal.targetCents,
  })

  const pace = jarPace({
    currentCents: goal.currentCents,
    targetCents: goal.targetCents,
    startedAt: goal.createdAt,
    deadline: goal.deadline,
  })

  const handleAdd = () =>
    addMutation.mutate(unitsToCents(selected), {
      onSuccess: () => {
        setConfirming(true)
        window.setTimeout(() => setConfirming(false), 1400)
      },
    })

  return (
    <GoalDetailView
      goal={goal}
      progress={progress}
      pace={pace}
      presetAmounts={PRESET_AMOUNTS}
      selectedAmount={selected}
      showBalances={showBalances}
      confirming={confirming}
      isAdding={addMutation.isPending}
      onBack={() => navigate({ to: '..' })}
      onSelectAmount={setSelected}
      onAdd={handleAdd}
    />
  )
}
