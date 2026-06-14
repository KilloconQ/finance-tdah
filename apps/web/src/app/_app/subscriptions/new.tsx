import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AppBar, Btn, Chip, Hello, PhoneShell } from '@/components'
import { mutations } from '@/lib/queries'

export const Route = createFileRoute('/_app/subscriptions/new')({
  component: SubscriptionNew,
})

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
    if (!name.trim()) { setError('El nombre es obligatorio'); return }
    if (!category.trim()) { setError('La categoría es obligatoria'); return }
    if (!amount || parseFloat(amount) <= 0) { setError('El monto debe ser mayor a 0'); return }
    if (!nextChargeAt) { setError('La fecha del próximo cobro es obligatoria'); return }
    createMutation.mutate()
  }

  return (
    <PhoneShell>
      <AppBar
        title="Nueva suscripción"
        left={
          <button
            type="button"
            onClick={() => navigate({ to: '..' })}
            className="wf-tap text-[16px] text-ink"
          >
            ✕
          </button>
        }
      />

      <div className="flex flex-1 flex-col overflow-y-auto px-6 pb-4 pt-4">
        <h1 className="text-[22px] font-medium leading-tight text-ink">¿Qué suscripción tienes?</h1>
        <Hello className="mt-1.5">Agrégala y ve si la sigues necesitando.</Hello>

        <div className="mt-5 space-y-3">
          <div>
            <label className="wf-mono block text-[11px] uppercase tracking-[0.08em] text-ink-mid">
              Nombre
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Netflix"
              className="mt-1.5 w-full rounded-[10px] border border-line bg-surface px-4 py-3 text-[15px] text-ink focus:border-ink focus:outline-none"
            />
          </div>

          <div>
            <label className="wf-mono block text-[11px] uppercase tracking-[0.08em] text-ink-mid">
              Categoría
            </label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Ej: Entretenimiento"
              className="mt-1.5 w-full rounded-[10px] border border-line bg-surface px-4 py-3 text-[15px] text-ink focus:border-ink focus:outline-none"
            />
          </div>

          <div>
            <label className="wf-mono block text-[11px] uppercase tracking-[0.08em] text-ink-mid">
              Monto (en pesos)
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              min="0"
              step="0.01"
              className="mt-1.5 w-full rounded-[10px] border border-line bg-surface px-4 py-3 text-[15px] text-ink focus:border-ink focus:outline-none"
            />
          </div>

          <div>
            <label className="wf-mono block text-[11px] uppercase tracking-[0.08em] text-ink-mid">
              Frecuencia
            </label>
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
            <label className="wf-mono block text-[11px] uppercase tracking-[0.08em] text-ink-mid">
              Próximo cobro
            </label>
            <input
              type="date"
              value={nextChargeAt}
              onChange={(e) => setNextChargeAt(e.target.value)}
              className="mt-1.5 w-full rounded-[10px] border border-line bg-surface px-4 py-3 text-[15px] text-ink focus:border-ink focus:outline-none"
            />
          </div>
        </div>

        <div className="flex-1" />

        {error ? (
          <div className="mb-3 rounded-[10px] bg-danger-bg px-3 py-2 text-[13px] text-danger">
            {error}
          </div>
        ) : null}

        <Btn
          kind="primary"
          className="mt-4 w-full py-3.5"
          onClick={handleSubmit}
          disabled={createMutation.isPending}
        >
          {createMutation.isPending ? 'Guardando…' : 'Agregar suscripción'}
        </Btn>
      </div>
    </PhoneShell>
  )
}
