import { useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { centsToUnits, parseAmountToCents } from '@finance-tdah/shared/domain'
import { AppBar, EmptyState, IconButton, PhoneShell } from '@/components'
import { goalQueryOptions, useUpdateGoal } from '../api'
import { GoalForm, type GoalFormFields } from '../components/GoalForm'

interface EditGoalContainerProps {
  goalId: string
}

export function EditGoalContainer({ goalId }: EditGoalContainerProps) {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const inFlight = useRef(false)

  const { data: goal } = useQuery(goalQueryOptions(goalId))
  const updateGoal = useUpdateGoal(goalId)

  const goBack = () => navigate({ to: '/goals/$id', params: { id: goalId } })

  if (!goal) {
    return (
      <PhoneShell variant="narrow">
        <AppBar title="Editar meta" back onBack={() => navigate({ to: '/goals' })} />
        <EmptyState
          className="flex-1"
          title="No encontramos ese frasco"
          hint="Puede que lo hayas eliminado o que el enlace esté roto."
        />
      </PhoneShell>
    )
  }

  const handleSubmit = (fields: GoalFormFields) => {
    setError(null)

    const targetCents = parseAmountToCents(fields.target)
    if (targetCents === null || targetCents <= 0) {
      setError('La meta debe ser mayor a $0')
      return
    }

    if (inFlight.current) return
    inFlight.current = true
    updateGoal.mutate(
      { name: fields.name, emoji: fields.emoji, targetCents },
      {
        onSuccess: () => navigate({ to: '/goals/$id', params: { id: goalId }, replace: true }),
        onError: (err) => {
          inFlight.current = false
          setError(err instanceof Error ? err.message : 'No pudimos actualizar el frasco')
        },
      },
    )
  }

  return (
    <PhoneShell variant="narrow">
      <AppBar
        title="Editar meta"
        left={
          <IconButton onClick={goBack} label="Cerrar">
            <X size={20} strokeWidth={2} />
          </IconButton>
        }
      />
      <GoalForm
        submitting={updateGoal.isPending}
        error={error}
        onSubmit={handleSubmit}
        initial={{
          name: goal.name,
          emoji: goal.emoji,
          target: String(centsToUnits(goal.targetCents)),
        }}
        submitLabel="Guardar cambios"
      />
    </PhoneShell>
  )
}
