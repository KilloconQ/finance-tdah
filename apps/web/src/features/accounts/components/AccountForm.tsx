import { useState } from 'react'
import type { AccountType } from '@finance-tdah/shared/domain'
import { Btn } from '@/components'
import { cn } from '@/lib/cn'

export interface AccountFormFields {
  name: string
  type: AccountType
  balance: string
  institution?: string
  last4?: string
}

interface AccountTypeOption {
  value: AccountType
  label: string
  emoji: string
}

const TYPES: AccountTypeOption[] = [
  { value: 'debito', label: 'Débito', emoji: '🏦' },
  { value: 'credito', label: 'Crédito', emoji: '💳' },
  { value: 'efectivo', label: 'Efectivo', emoji: '💵' },
  { value: 'wallet', label: 'Wallet', emoji: '📱' },
  { value: 'ahorro', label: 'Ahorro', emoji: '🐷' },
]

const LABEL_CLASS = 'text-sm font-medium text-ink-mid'
const INPUT_CLASS =
  'mt-1.5 w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-[15px] text-ink outline-none placeholder:text-ink-soft focus:border-accent'

interface AccountFormProps {
  submitting: boolean
  error: string | null
  onSubmit: (fields: AccountFormFields) => void
}

export function AccountForm({ submitting, error, onSubmit }: AccountFormProps) {
  const [name, setName] = useState('')
  const [type, setType] = useState<AccountType>('debito')
  const [balance, setBalance] = useState('')
  const [institution, setInstitution] = useState('')
  const [last4, setLast4] = useState('')

  const isCard = type === 'debito' || type === 'credito'
  const canSubmit = name.trim() !== '' && !submitting

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    onSubmit({
      name: name.trim(),
      type,
      balance,
      institution: institution.trim() || undefined,
      last4: last4.trim() || undefined,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 py-2">
      <div>
        <label htmlFor="name" className={LABEL_CLASS}>
          Nombre
        </label>
        <input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          autoFocus
          placeholder="Ej: BBVA Débito"
          className={INPUT_CLASS}
        />
      </div>

      <div>
        <span className={LABEL_CLASS}>Tipo</span>
        <div className="mt-2 flex flex-wrap gap-2">
          {TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setType(t.value)}
              className={cn(
                'inline-flex items-center gap-1 rounded-full border px-3.5 py-2 text-sm transition-colors',
                type === t.value
                  ? 'border-accent bg-accent text-surface'
                  : 'border-line bg-surface text-ink-mid hover:bg-bg-alt',
              )}
            >
              <span>{t.emoji}</span>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="balance" className={LABEL_CLASS}>
          {type === 'credito' ? '¿Cuánto debes?' : 'Saldo actual'}
        </label>
        <div className="mt-1.5 flex items-baseline gap-1.5 border-b border-line pb-2 focus-within:border-accent">
          <span className="money text-2xl font-medium text-ink">$</span>
          <input
            id="balance"
            inputMode="decimal"
            autoComplete="off"
            value={balance}
            onChange={(e) => setBalance(e.target.value)}
            placeholder="0"
            className="money w-full bg-transparent text-3xl font-semibold leading-none tracking-tight text-ink caret-accent outline-none placeholder:font-normal placeholder:text-ink-soft"
          />
        </div>
      </div>

      {isCard ? (
        <div className="flex gap-3">
          <div className="flex-1">
            <label htmlFor="institution" className={LABEL_CLASS}>
              Banco (opcional)
            </label>
            <input
              id="institution"
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              maxLength={60}
              placeholder="BBVA"
              className={INPUT_CLASS}
            />
          </div>
          <div className="w-28">
            <label htmlFor="last4" className={LABEL_CLASS}>
              Últimos 4
            </label>
            <input
              id="last4"
              inputMode="numeric"
              value={last4}
              onChange={(e) => setLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="4521"
              className={cn(INPUT_CLASS, 'money tracking-wide')}
            />
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl bg-danger-bg px-3.5 py-2.5 text-sm text-danger">{error}</div>
      ) : null}

      <Btn kind="primary" type="submit" className="mt-2 w-full" disabled={!canSubmit}>
        {submitting ? 'Guardando…' : 'Agregar cuenta'}
      </Btn>
    </form>
  )
}
