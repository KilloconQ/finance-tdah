import { useState } from 'react'
import { Btn, Chip } from '@/components'

export type MovementKind = 'expense' | 'income' | 'transfer'

export interface ExpenseFormFields {
  amount: string
  category: string
  description: string
  accountId?: string
  kind: MovementKind
  toAccountId?: string
}

export interface ExpenseFormAccount {
  id: string
  name: string
  type: string
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

const KIND_OPTIONS: { value: MovementKind; label: string }[] = [
  { value: 'expense', label: 'Gasto' },
  { value: 'income', label: 'Ingreso' },
  { value: 'transfer', label: 'Transferencia' },
]

const TRANSFER_CATEGORY = 'transferencia'
const INCOME_CATEGORY = 'ingreso'

const SUBMIT_LABEL: Record<MovementKind, string> = {
  expense: 'Guardar gasto',
  income: 'Guardar ingreso',
  transfer: 'Transferir',
}

interface ExpenseFormProps {
  accounts: ExpenseFormAccount[]
  submitting: boolean
  error: string | null
  onSubmit: (fields: ExpenseFormFields) => void
  onUseVoice?: () => void
  initial?: Partial<ExpenseFormFields>
  submitLabel?: string
}

export function ExpenseForm({
  accounts,
  submitting,
  error,
  onSubmit,
  onUseVoice,
  initial,
  submitLabel,
}: ExpenseFormProps) {
  const [kind, setKind] = useState<MovementKind>(initial?.kind ?? 'expense')
  const [amount, setAmount] = useState(initial?.amount ?? '')
  const [category, setCategory] = useState(initial?.category ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [accountId, setAccountId] = useState<string>(initial?.accountId ?? '')
  const [toAccountId, setToAccountId] = useState<string>(initial?.toAccountId ?? '')

  const hasAmount = amount.trim() !== ''
  const isTransfer = kind === 'transfer'
  const isIncome = kind === 'income'

  // Income can't land on a credit account — that account only ever holds
  // debt, it doesn't receive money coming in.
  const availableAccounts = isIncome ? accounts.filter((a) => a.type !== 'credito') : accounts

  // If the selected account isn't in the currently allowed set (e.g. it was
  // a credit account and the kind just switched to income), fall back to the
  // first available one — derived, not stored, so it never needs an effect.
  const effectiveAccountId =
    accountId && availableAccounts.some((a) => a.id === accountId)
      ? accountId
      : (availableAccounts[0]?.id ?? '')

  // A transfer's destination can't be the source. If the explicit selection
  // is missing or now collides with the source, fall back to the first
  // different account — derived, not stored, so it never needs an effect.
  const effectiveToAccountId =
    toAccountId && toAccountId !== effectiveAccountId
      ? toAccountId
      : (accounts.find((a) => a.id !== effectiveAccountId)?.id ?? '')

  const canSubmit =
    hasAmount &&
    description.trim() !== '' &&
    (isTransfer || isIncome || category !== '') &&
    (availableAccounts.length === 0 || effectiveAccountId !== '') &&
    (!isTransfer || effectiveToAccountId !== '') &&
    !submitting

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    onSubmit({
      amount,
      category: isTransfer ? TRANSFER_CATEGORY : isIncome ? INCOME_CATEGORY : category,
      description: description.trim(),
      accountId: effectiveAccountId || undefined,
      kind,
      toAccountId: isTransfer ? effectiveToAccountId || undefined : undefined,
    })
  }

  const sourceLabel = isTransfer ? 'Desde qué cuenta' : kind === 'income' ? 'A qué cuenta' : 'De qué cuenta'

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-lg flex-1 flex-col gap-6 pb-8">
      <div>
        <span className="text-sm font-medium text-ink-mid">Tipo</span>
        <div className="mt-2 flex flex-wrap gap-2">
          {KIND_OPTIONS.map((k) => (
            <Chip key={k.value} active={kind === k.value} onClick={() => setKind(k.value)}>
              {k.label}
            </Chip>
          ))}
        </div>
      </div>

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
            className="money money-lg w-full bg-transparent text-5xl font-light leading-none tracking-[-0.02em] text-ink outline-none placeholder:text-ink-soft"
          />
        </div>
      </div>

      {isTransfer || isIncome ? null : (
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
      )}

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

      {availableAccounts.length > 0 ? (
        <div>
          <label htmlFor="account" className="text-sm font-medium text-ink-mid">
            {sourceLabel}
          </label>
          <select
            id="account"
            value={effectiveAccountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm text-ink outline-none transition-colors focus:border-accent"
          >
            {availableAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {isTransfer && accounts.length > 0 ? (
        <div>
          <label htmlFor="to-account" className="text-sm font-medium text-ink-mid">
            Hacia qué cuenta
          </label>
          <select
            id="to-account"
            value={effectiveToAccountId}
            onChange={(e) => setToAccountId(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm text-ink outline-none transition-colors focus:border-accent"
          >
            {accounts
              .filter((a) => a.id !== effectiveAccountId)
              .map((a) => (
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
          {submitting ? 'Guardando…' : (submitLabel ?? SUBMIT_LABEL[kind])}
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
