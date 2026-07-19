import { useEffect, useState } from 'react'
import { Btn, Chip } from '@/components'

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

  // A gasto should always come out of an account. Default to the first one once
  // accounts load (the user can still switch). Only screens with zero accounts
  // are allowed to log without one.
  useEffect(() => {
    if (!accountId && accounts.length > 0) setAccountId(accounts[0].id)
  }, [accounts, accountId])

  const hasAmount = amount.trim() !== ''

  const canSubmit =
    hasAmount &&
    description.trim() !== '' &&
    category !== '' &&
    (accounts.length === 0 || accountId !== '') &&
    !submitting

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
    <form onSubmit={handleSubmit} className="flex w-full max-w-lg flex-1 flex-col gap-6 pb-8">
      <div>
        <label htmlFor="amount" className="text-sm font-medium text-ink-mid">
          Cuánto
        </label>
        <div className="mt-1 flex items-baseline gap-1">
          <span className={`money text-4xl font-light ${hasAmount ? 'text-ink' : 'text-ink-soft'}`}>
            $
          </span>
          <input
            id="amount"
            inputMode="decimal"
            autoComplete="off"
            autoFocus
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            className="money w-full bg-transparent text-5xl font-light leading-none tracking-[-0.02em] text-ink outline-none placeholder:text-ink-soft"
          />
        </div>
      </div>

      <div>
        <span className="text-sm font-medium text-ink-mid">En qué</span>
        <div className="mt-2 flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <Chip
              key={c.value}
              active={category === c.value}
              onClick={() => setCategory(c.value)}
            >
              <span>{c.emoji}</span>
              {c.label}
            </Chip>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="description" className="text-sm font-medium text-ink-mid">
          Nota
        </label>
        <input
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={120}
          placeholder="Ej: Café con Lu"
          className="mt-1.5 w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm text-ink outline-none transition-colors placeholder:text-ink-soft focus:border-accent"
        />
      </div>

      {accounts.length > 0 ? (
        <div>
          <label htmlFor="account" className="text-sm font-medium text-ink-mid">
            De qué cuenta
          </label>
          <select
            id="account"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm text-ink outline-none transition-colors focus:border-accent"
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl bg-danger-bg px-3 py-2 text-sm text-danger">{error}</div>
      ) : null}

      <div className="mt-2">
        <Btn kind="primary" type="submit" className="w-full sm:w-auto sm:min-w-48" disabled={!canSubmit}>
          {submitting ? 'Guardando…' : 'Guardar gasto'}
        </Btn>
        {onUseVoice ? (
          <button
            type="button"
            onClick={onUseVoice}
            className="wf-tap mt-3 block w-full text-center text-xs text-ink-mid underline sm:mt-0 sm:ml-4 sm:inline sm:w-auto"
          >
            o usar la voz
          </button>
        ) : null}
      </div>
    </form>
  )
}
