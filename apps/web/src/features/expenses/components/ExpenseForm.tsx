import { useState } from 'react'
import { Btn } from '@/components'
import { cn } from '@/lib/cn'

export interface ExpenseFormFields {
  amount: string
  category: string
  description: string
  accountId?: string
}

export interface ExpenseFormAccount {
  id: string
  name: string
}

interface ExpenseCategory {
  value: string
  label: string
  emoji: string
}

const CATEGORIES: ExpenseCategory[] = [
  { value: 'comida', label: 'Comida', emoji: '🍔' },
  { value: 'café', label: 'Café', emoji: '☕' },
  { value: 'transporte', label: 'Transporte', emoji: '🚗' },
  { value: 'super', label: 'Súper', emoji: '🛒' },
  { value: 'salidas', label: 'Salidas', emoji: '🎉' },
  { value: 'salud', label: 'Salud', emoji: '💊' },
  { value: 'casa', label: 'Casa', emoji: '🏠' },
  { value: 'subs', label: 'Subs', emoji: '📺' },
  { value: 'otro', label: 'Otro', emoji: '•' },
]

interface ExpenseFormProps {
  accounts: ExpenseFormAccount[]
  submitting: boolean
  error: string | null
  onSubmit: (fields: ExpenseFormFields) => void
  onUseVoice?: () => void
}

export function ExpenseForm({ accounts, submitting, error, onSubmit, onUseVoice }: ExpenseFormProps) {
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [accountId, setAccountId] = useState<string>('')

  const canSubmit = amount.trim() !== '' && description.trim() !== '' && category !== '' && !submitting

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    onSubmit({
      amount,
      category,
      description: description.trim(),
      accountId: accountId || undefined,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-5 px-6 pt-2">
      <div>
        <label htmlFor="amount" className="wf-mono text-[11px] uppercase tracking-[0.08em] text-ink-mid">
          Cuánto
        </label>
        <div className="mt-1 flex items-baseline gap-1">
          <span className="wf-mono text-[28px] font-light text-ink-mid">$</span>
          <input
            id="amount"
            inputMode="decimal"
            autoComplete="off"
            autoFocus
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            className="wf-mono w-full bg-transparent text-[40px] font-light leading-none tracking-[-0.02em] text-ink outline-none placeholder:text-ink-soft"
          />
        </div>
      </div>

      <div>
        <span className="wf-mono text-[11px] uppercase tracking-[0.08em] text-ink-mid">
          En qué
        </span>
        <div className="mt-2 flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setCategory(c.value)}
              className={cn(
                'wf-tap rounded-full border px-3 py-1.5 text-[13px] transition-colors',
                category === c.value
                  ? 'border-ink bg-ink text-surface'
                  : 'border-line bg-surface text-ink-mid',
              )}
            >
              <span className="mr-1">{c.emoji}</span>
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label
          htmlFor="description"
          className="wf-mono text-[11px] uppercase tracking-[0.08em] text-ink-mid"
        >
          Nota
        </label>
        <input
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={120}
          placeholder="Ej: Café con Lu"
          className="mt-1 w-full rounded-[10px] border border-line bg-surface px-3 py-2.5 text-[14px] text-ink outline-none placeholder:text-ink-soft focus:border-ink"
        />
      </div>

      {accounts.length > 0 ? (
        <div>
          <label
            htmlFor="account"
            className="wf-mono text-[11px] uppercase tracking-[0.08em] text-ink-mid"
          >
            De qué cuenta (opcional)
          </label>
          <select
            id="account"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="mt-1 w-full rounded-[10px] border border-line bg-surface px-3 py-2.5 text-[14px] text-ink outline-none focus:border-ink"
          >
            <option value="">Ninguna</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-[10px] bg-danger-bg px-3 py-2 text-[13px] text-danger">{error}</div>
      ) : null}

      <div className="flex-1" />

      <div className="pb-5">
        <Btn kind="primary" type="submit" className="w-full py-4" disabled={!canSubmit}>
          {submitting ? 'Guardando…' : 'Guardar gasto'}
        </Btn>
        {onUseVoice ? (
          <button
            type="button"
            onClick={onUseVoice}
            className="wf-tap mt-3 w-full text-center text-[12px] text-ink-mid underline"
          >
            o usar la voz
          </button>
        ) : null}
      </div>
    </form>
  )
}
