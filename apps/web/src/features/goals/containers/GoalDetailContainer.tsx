import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { centsToUnits, jarPace, jarProgress, parseAmountToCents, unitsToCents } from '@finance-tdah/shared/domain'
import { AppBar, Btn, EmptyState, PhoneShell, TabBar } from '@/components'
import { useTweaks } from '@/lib/use-tweaks'
import { goalQueryOptions, useAddToGoal, useDeleteGoal } from '../api'
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
  const deleteMutation = useDeleteGoal(goalId)
  const [selected, setSelected] = useState<number>(100)
  const [isCustom, setIsCustom] = useState(false)
  const [customAmount, setCustomAmount] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  if (!goal) {
    return (
      <PhoneShell>
        <AppBar title="Frasco" back onBack={() => navigate({ to: '/goals' })} />
        <EmptyState
          className="flex-1"
          title="No encontramos ese frasco"
          hint="Puede que lo hayas archivado o que el enlace esté roto."
          action={
            <Btn kind="ghost" onClick={() => navigate({ to: '/goals' })}>
              Volver a frascos
            </Btn>
          }
        />
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

  const customCents = parseAmountToCents(customAmount)
  const amountCents = isCustom ? customCents : unitsToCents(selected)
  const canAdd = amountCents !== null

  const handleAdd = () => {
    if (amountCents === null) return
    addMutation.mutate(amountCents, {
      onSuccess: () => {
        setConfirming(true)
        window.setTimeout(() => setConfirming(false), 1400)
      },
    })
  }

  const handleDelete = () => {
    deleteMutation.mutate(undefined, {
      onSuccess: () => {
        navigate({ to: '/goals', replace: true })
      },
    })
  }

  return (
    <GoalDetailView
      goal={goal}
      progress={progress}
      pace={pace}
      presetAmounts={PRESET_AMOUNTS}
      selectedAmount={isCustom ? (customCents !== null ? centsToUnits(customCents) : 0) : selected}
      isCustom={isCustom}
      customAmount={customAmount}
      showBalances={showBalances}
      confirming={confirming}
      isAdding={addMutation.isPending}
      canAdd={canAdd}
      deleteConfirm={deleteConfirm}
      isDeleting={deleteMutation.isPending}
      onBack={() => navigate({ to: '..' })}
      onSelectAmount={(amount) => {
        setIsCustom(false)
        setSelected(amount)
      }}
      onSelectCustom={() => setIsCustom(true)}
      onCustomAmountChange={setCustomAmount}
      onAdd={handleAdd}
      onRequestDelete={() => setDeleteConfirm(true)}
      onCancelDelete={() => setDeleteConfirm(false)}
      onConfirmDelete={handleDelete}
    />
  )
}
