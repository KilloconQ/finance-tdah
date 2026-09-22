import { useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { X } from 'lucide-react'
import { parseAmountToCents } from '@finance-tdah/shared/domain'
import { AppBar, IconButton, PhoneShell } from '@/components'
import { useCreateSubscription } from '../api'
import { SubscriptionForm, type SubscriptionFormFields } from '../components/SubscriptionForm'

export function NewSubscriptionContainer() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const inFlight = useRef(false)

  const createSubscription = useCreateSubscription()

  const handleSubmit = (fields: SubscriptionFormFields) => {
    setError(null)

    const amountCents = parseAmountToCents(fields.amount)
    if (amountCents === null || amountCents <= 0) {
      setError('El monto debe ser mayor a $0')
      return
    }

    if (inFlight.current) return
    inFlight.current = true
    createSubscription.mutate(
      {
        name: fields.name,
        category: fields.category,
        amountCents,
        cadence: fields.cadence,
        nextChargeAt: fields.nextChargeAt,
      },
      {
        onSuccess: () => navigate({ to: '/subscriptions', replace: true }),
        onError: (err) => {
          inFlight.current = false
          setError(err instanceof Error ? err.message : 'No pudimos crear la suscripción')
        },
      },
    )
  }

  return (
    <PhoneShell variant="narrow">
      <AppBar
        title="Nueva suscripción"
        left={
          <IconButton onClick={() => navigate({ to: '/subscriptions' })} label="Cerrar">
            <X size={20} strokeWidth={2} />
          </IconButton>
        }
      />
      <SubscriptionForm
        submitting={createSubscription.isPending}
        error={error}
        onSubmit={handleSubmit}
        initial={{ cadence: 'monthly' }}
        submitLabel="Agregar suscripción"
      />
    </PhoneShell>
  )
}
