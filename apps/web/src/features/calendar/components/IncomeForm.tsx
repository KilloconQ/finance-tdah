import { useState } from 'react'
import { amountFormatError, parseAmountToCents, type IncomeFrequency } from '@finance-tdah/shared/domain'
import { AmountInput } from '@/components/AmountInput'
import { Btn, Chip } from '@/components'
import { useSavingLabel } from '@/lib/use-online'
import { FREQUENCY_LABEL } from '../labels'

export interface IncomeFormValues {
  name: string
  amountCents: number | null
  frequency: IncomeFrequency
  startsOn: string
}

const FIELD_CLASS =
  'mt-1.5 w-full rounded-xl border border-line bg-surface px-4 py-3 text-base text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-bg'
const LABEL_CLASS = 'block text-sm font-medium text-ink-mid'

interface IncomeFormProps {
  initial?: Partial<IncomeFormValues>
  submitting: boolean
  error: string | null
  submitLabel: string
  onSubmit: (values: IncomeFormValues) => void
  onDelete?: () => void
}

export function IncomeForm({ initial, submitting, error, submitLabel, onSubmit, onDelete }: IncomeFormProps) {
  const savingLabel = useSavingLabel()
  const [name, setName] = useState(initial?.name ?? '')
  const [amount, setAmount] = useState(initial?.amountCents == null ? '' : String(initial.amountCents / 100))
  const [frequency, setFrequency] = useState<IncomeFrequency>(initial?.frequency ?? 'semimonthly')
  const [startsOn, setStartsOn] = useState(initial?.startsOn ?? '')
  const [formError, setFormError] = useState<string | null>(null)

  const canSubmit = name.trim() !== '' && startsOn !== '' && !submitting

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setFormError(null)
    let amountCents: number | null = null
    if (amount.trim() !== '') {
      amountCents = parseAmountToCents(amount)
      if (amountCents === null || amountCents <= 0) {
        setFormError(amountFormatError(amount) ?? 'El monto debe ser mayor a $0')
        return
      }
    }
    onSubmit({ name: name.trim(), amountCents, frequency, startsOn })
  }

  const shownError = formError ?? error

  return (
    <form noValidate onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="income-name" className={LABEL_CLASS}>
          Nombre
        </label>
        <input
          id="income-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej: Nómina"
          className={FIELD_CLASS}
        />
      </div>

      <div>
        <label htmlFor="income-amount" className={LABEL_CLASS}>
          Monto (opcional, en pesos)
        </label>
        <AmountInput id="income-amount" value={amount} onChange={setAmount} placeholder="0" className={FIELD_CLASS} />
      </div>

      <div>
        <span className={LABEL_CLASS}>Cada cuándo</span>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {(Object.keys(FREQUENCY_LABEL) as IncomeFrequency[]).map((f) => (
            <Chip key={f} active={frequency === f} onClick={() => setFrequency(f)}>
              {FREQUENCY_LABEL[f]}
            </Chip>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="income-date" className={LABEL_CLASS}>
          {frequency === 'once' ? 'Fecha' : 'Primer pago'}
        </label>
        <input id="income-date" type="date" value={startsOn} onChange={(e) => setStartsOn(e.target.value)} className={FIELD_CLASS} />
      </div>

      {shownError ? <div className="rounded-xl bg-danger-bg px-3 py-2 text-sm text-danger">{shownError}</div> : null}

      <Btn kind="primary" type="submit" className="w-full" disabled={!canSubmit}>
        {submitting ? savingLabel : submitLabel}
      </Btn>
      {onDelete ? (
        <Btn kind="danger" type="button" className="w-full" onClick={onDelete} disabled={submitting}>
          Eliminar
        </Btn>
      ) : null}
    </form>
  )
}
