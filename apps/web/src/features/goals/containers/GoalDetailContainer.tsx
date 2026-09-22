import { useEffect, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import confetti from 'canvas-confetti'
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
  const [confirmedCents, setConfirmedCents] = useState<number | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleted, setDeleted] = useState(false)
  const previousPercentRef = useRef<number | null>(null)

  useEffect(() => {
    if (!goal) return
    const percent = jarProgress({ currentCents: goal.currentCents, targetCents: goal.targetCents }).percent
    // previousPercentRef starts as null until the goal first loads, so an
    // already-completed goal never fires confetti on first mount — only a
    // later crossing while the page stays open does.
    if (previousPercentRef.current !== null && previousPercentRef.current < 100 && percent >= 100) {
      confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } })
    }
    previousPercentRef.current = percent
  }, [goal])

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
  const canAdd = amountCents !== null && amountCents > 0

  const handleAdd = () => {
    if (amountCents === null) return
    addMutation.mutate(amountCents, {
      onSuccess: () => {
        setConfirmedCents(amountCents)
        setConfirming(true)
        window.setTimeout(() => setConfirming(false), 1400)
        setSelected(0)
        setIsCustom(false)
        setCustomAmount('')
      },
    })
  }

  const handleDelete = () => {
    deleteMutation.mutate(undefined, {
      onSuccess: () => {
        setDeleted(true)
        window.setTimeout(() => navigate({ to: '/goals', replace: true }), 1200)
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
      confirmedAmountCents={confirmedCents}
      isAdding={addMutation.isPending}
      canAdd={canAdd}
      deleteConfirm={deleteConfirm}
      isDeleting={deleteMutation.isPending}
      deleted={deleted}
      onBack={() => navigate({ to: '..' })}
      onEdit={() => navigate({ to: '/goals/$id/edit', params: { id: goalId } })}
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
