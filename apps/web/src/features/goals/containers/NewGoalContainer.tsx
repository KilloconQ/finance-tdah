import { useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { X } from 'lucide-react'
import { parseAmountToCents } from '@finance-tdah/shared/domain'
import { AppBar, IconButton, PhoneShell } from '@/components'
import { useCreateGoal } from '../api'
import { GoalForm, type GoalFormFields } from '../components/GoalForm'

export function NewGoalContainer() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const inFlight = useRef(false)

  const createGoal = useCreateGoal()

  const handleSubmit = (fields: GoalFormFields) => {
    setError(null)

    const targetCents = parseAmountToCents(fields.target)
    if (targetCents === null || targetCents <= 0) {
      setError('La meta debe ser mayor a $0')
      return
    }

    if (inFlight.current) return
    inFlight.current = true
    createGoal.mutate(
      { name: fields.name, emoji: fields.emoji, targetCents },
      {
        onSuccess: () => navigate({ to: '/goals', replace: true }),
        onError: (err) => {
          inFlight.current = false
          setError(err instanceof Error ? err.message : 'No pudimos crear el frasco')
        },
      },
    )
  }

  return (
    <PhoneShell variant="narrow">
      <AppBar
        title="Nueva meta"
        left={
          <IconButton onClick={() => navigate({ to: '/goals' })} label="Cerrar">
            <X size={20} strokeWidth={2} />
          </IconButton>
        }
      />
      <GoalForm
        submitting={createGoal.isPending}
        error={error}
        onSubmit={handleSubmit}
        initial={{ name: 'Nueva meta', emoji: '🌿', target: '5000' }}
        submitLabel="Crear frasco"
      />
    </PhoneShell>
  )
}
