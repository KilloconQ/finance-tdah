import { useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { centsToUnits, parseAmountToCents } from '@finance-tdah/shared/domain'
import { AppBar, EmptyState, IconButton, PhoneShell } from '@/components'
import { subscriptionQueryOptions, useUpdateSubscription } from '../api'
import { SubscriptionForm, type SubscriptionFormFields } from '../components/SubscriptionForm'

interface EditSubscriptionContainerProps {
  subscriptionId: string
}

export function EditSubscriptionContainer({ subscriptionId }: EditSubscriptionContainerProps) {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const inFlight = useRef(false)

  const { data: subscription } = useQuery(subscriptionQueryOptions(subscriptionId))
  const updateSubscription = useUpdateSubscription(subscriptionId)

  const goBack = () => navigate({ to: '/subscriptions/$id', params: { id: subscriptionId } })

  if (!subscription) {
    return (
      <PhoneShell variant="narrow">
        <AppBar title="Editar suscripción" back onBack={() => navigate({ to: '/subscriptions' })} />
        <EmptyState
          className="flex-1"
          title="No encontramos esa suscripción"
          hint="Puede que la hayas cancelado o que el enlace esté roto."
        />
      </PhoneShell>
    )
  }

  const handleSubmit = (fields: SubscriptionFormFields) => {
    setError(null)

    const amountCents = parseAmountToCents(fields.amount)
    if (amountCents === null || amountCents <= 0) {
      setError('El monto debe ser mayor a $0')
      return
    }

    if (inFlight.current) return
    inFlight.current = true
    updateSubscription.mutate(
      {
        name: fields.name,
        category: fields.category,
        amountCents,
        cadence: fields.cadence,
        nextChargeAt: fields.nextChargeAt,
      },
      {
        onSuccess: () =>
          navigate({ to: '/subscriptions/$id', params: { id: subscriptionId }, replace: true }),
        onError: (err) => {
          inFlight.current = false
          setError(err instanceof Error ? err.message : 'No pudimos actualizar la suscripción')
        },
      },
    )
  }

  return (
    <PhoneShell variant="narrow">
      <AppBar
        title="Editar suscripción"
        left={
          <IconButton onClick={goBack} label="Cerrar">
            <X size={20} strokeWidth={2} />
          </IconButton>
        }
      />
      <SubscriptionForm
        submitting={updateSubscription.isPending}
        error={error}
        onSubmit={handleSubmit}
        initial={{
          name: subscription.name,
          category: subscription.category,
          amount: String(centsToUnits(subscription.amountCents)),
          cadence: subscription.cadence,
          nextChargeAt: subscription.nextChargeAt,
        }}
        submitLabel="Guardar cambios"
      />
    </PhoneShell>
  )
}
