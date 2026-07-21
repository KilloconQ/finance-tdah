import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { AppBar, Btn, Chip, Hello, IconButton, PhoneShell } from '@/components'
import { mutations } from '@/lib/queries'

export const Route = createFileRoute('/_app/subscriptions/new')({
  component: SubscriptionNew,
})

const FIELD_CLASS =
  'mt-1.5 w-full rounded-xl border border-line bg-surface px-4 py-3 text-base text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-bg'
const LABEL_CLASS = 'block text-sm font-medium text-ink-mid'

function SubscriptionNew() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [amount, setAmount] = useState('')
  const [cadence, setCadence] = useState<'monthly' | 'yearly'>('monthly')
  const [nextChargeAt, setNextChargeAt] = useState('')
  const [error, setError] = useState<string | null>(null)

  const createMutation = useMutation({
    mutationFn: () =>
      mutations.createSubscription({
        name,
        category,
        amountCents: Math.round(parseFloat(amount) * 100),
        cadence,
        nextChargeAt,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['subscriptions'] })
      navigate({ to: '/subscriptions', replace: true })
    },
    onError: (err) =>
      setError(err instanceof Error ? err.message : 'No pudimos crear la suscripción'),
  })

  const handleSubmit = () => {
    setError(null)
    if (!name.trim()) {
      setError('El nombre es obligatorio')
      return
    }
    if (!category.trim()) {
      setError('La categoría es obligatoria')
      return
    }
    if (!amount || parseFloat(amount) <= 0) {
      setError('El monto debe ser mayor a 0')
      return
    }
    if (!nextChargeAt) {
      setError('La fecha del próximo cobro es obligatoria')
      return
    }
    createMutation.mutate()
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

      <div className="pb-4">
        <h1 className="text-xl font-semibold tracking-tight text-ink">¿Qué suscripción tienes?</h1>
        <Hello className="mt-1.5">Agrégala y ve si la sigues necesitando.</Hello>

        <div className="mt-5 space-y-4">
          <div>
            <label className={LABEL_CLASS}>Nombre</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Netflix"
              className={FIELD_CLASS}
            />
          </div>

          <div>
            <label className={LABEL_CLASS}>Categoría</label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Ej: Entretenimiento"
              className={FIELD_CLASS}
            />
          </div>

          <div>
            <label className={LABEL_CLASS}>Monto (en pesos)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              min="0"
              step="0.01"
              className={FIELD_CLASS}
            />
          </div>

          <div>
            <label className={LABEL_CLASS}>Frecuencia</label>
            <div className="mt-1.5 flex gap-2">
              <Chip active={cadence === 'monthly'} onClick={() => setCadence('monthly')}>
                Mensual
              </Chip>
              <Chip active={cadence === 'yearly'} onClick={() => setCadence('yearly')}>
                Anual
              </Chip>
            </div>
          </div>

          <div>
            <label className={LABEL_CLASS}>Próximo cobro</label>
            <input
              type="date"
              value={nextChargeAt}
              onChange={(e) => setNextChargeAt(e.target.value)}
              className={FIELD_CLASS}
            />
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-xl bg-danger-bg px-3 py-2 text-sm text-danger">{error}</div>
        ) : null}

        <Btn
          kind="primary"
          className="mt-5 w-full"
          onClick={handleSubmit}
          disabled={createMutation.isPending}
        >
          {createMutation.isPending ? 'Guardando…' : 'Agregar suscripción'}
        </Btn>
      </div>
    </PhoneShell>
  )
}
