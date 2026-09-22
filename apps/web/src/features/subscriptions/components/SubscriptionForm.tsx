import { useState } from 'react'
import { Btn, Chip } from '@/components'

export interface SubscriptionFormFields {
  name: string
  category: string
  amount: string
  cadence: 'monthly' | 'yearly'
  nextChargeAt: string
}

const FIELD_CLASS =
  'mt-1.5 w-full rounded-xl border border-line bg-surface px-4 py-3 text-base text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-bg'
const LABEL_CLASS = 'block text-sm font-medium text-ink-mid'

interface SubscriptionFormProps {
  submitting: boolean
  error: string | null
  onSubmit: (fields: SubscriptionFormFields) => void
  initial?: Partial<SubscriptionFormFields>
  submitLabel?: string
}

export function SubscriptionForm({
  submitting,
  error,
  onSubmit,
  initial,
  submitLabel,
}: SubscriptionFormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [category, setCategory] = useState(initial?.category ?? '')
  const [amount, setAmount] = useState(initial?.amount ?? '')
  const [cadence, setCadence] = useState<'monthly' | 'yearly'>(initial?.cadence ?? 'monthly')
  const [nextChargeAt, setNextChargeAt] = useState(initial?.nextChargeAt ?? '')

  const canSubmit =
    name.trim() !== '' &&
    category.trim() !== '' &&
    amount.trim() !== '' &&
    nextChargeAt.trim() !== '' &&
    !submitting

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    onSubmit({ name: name.trim(), category: category.trim(), amount, cadence, nextChargeAt })
  }

  return (
    <form onSubmit={handleSubmit} className="pb-4">
      <div className="space-y-4">
        <div>
          <label htmlFor="name" className={LABEL_CLASS}>
            Nombre
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Netflix"
            className={FIELD_CLASS}
          />
        </div>

        <div>
          <label htmlFor="category" className={LABEL_CLASS}>
            Categoría
          </label>
          <input
            id="category"
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Ej: Entretenimiento"
            className={FIELD_CLASS}
          />
        </div>

        <div>
          <label htmlFor="amount" className={LABEL_CLASS}>
            Monto (en pesos)
          </label>
          <input
            id="amount"
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
          <span className={LABEL_CLASS}>Frecuencia</span>
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
          <label htmlFor="nextChargeAt" className={LABEL_CLASS}>
            Próximo cobro
          </label>
          <input
            id="nextChargeAt"
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

      <Btn kind="primary" type="submit" className="mt-5 w-full" disabled={!canSubmit}>
        {submitting ? 'Guardando…' : submitLabel ?? 'Agregar suscripción'}
      </Btn>
    </form>
  )
}
