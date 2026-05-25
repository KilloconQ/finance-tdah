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
    <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-5 overflow-y-auto px-6 pt-2">
      <div>
        <label htmlFor="name" className="wf-mono text-[11px] uppercase tracking-[0.08em] text-ink-mid">
          Nombre
        </label>
        <input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          autoFocus
          placeholder="Ej: BBVA Débito"
          className="mt-1 w-full rounded-[10px] border border-line bg-surface px-3 py-2.5 text-[14px] text-ink outline-none placeholder:text-ink-soft focus:border-ink"
        />
      </div>

      <div>
        <span className="wf-mono text-[11px] uppercase tracking-[0.08em] text-ink-mid">Tipo</span>
        <div className="mt-2 flex flex-wrap gap-2">
          {TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setType(t.value)}
              className={cn(
                'wf-tap rounded-full border px-3 py-1.5 text-[13px] transition-colors',
                type === t.value
                  ? 'border-ink bg-ink text-surface'
                  : 'border-line bg-surface text-ink-mid',
              )}
            >
              <span className="mr-1">{t.emoji}</span>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label
          htmlFor="balance"
          className="wf-mono text-[11px] uppercase tracking-[0.08em] text-ink-mid"
        >
          {type === 'credito' ? '¿Cuánto debes?' : 'Saldo actual'}
        </label>
        <div className="mt-1 flex items-baseline gap-1">
          <span className="wf-mono text-[22px] font-light text-ink-mid">$</span>
          <input
            id="balance"
            inputMode="decimal"
            autoComplete="off"
            value={balance}
            onChange={(e) => setBalance(e.target.value)}
            placeholder="0"
            className="wf-mono w-full bg-transparent text-[28px] font-light leading-none tracking-[-0.02em] text-ink outline-none placeholder:text-ink-soft"
          />
        </div>
      </div>

      {isCard ? (
        <div className="flex gap-3">
          <div className="flex-1">
            <label
              htmlFor="institution"
              className="wf-mono text-[11px] uppercase tracking-[0.08em] text-ink-mid"
            >
              Banco (opcional)
            </label>
            <input
              id="institution"
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              maxLength={60}
              placeholder="BBVA"
              className="mt-1 w-full rounded-[10px] border border-line bg-surface px-3 py-2.5 text-[14px] text-ink outline-none placeholder:text-ink-soft focus:border-ink"
            />
          </div>
          <div className="w-24">
            <label
              htmlFor="last4"
              className="wf-mono text-[11px] uppercase tracking-[0.08em] text-ink-mid"
            >
              Últimos 4
            </label>
            <input
              id="last4"
              inputMode="numeric"
              value={last4}
              onChange={(e) => setLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="4521"
              className="wf-mono mt-1 w-full rounded-[10px] border border-line bg-surface px-3 py-2.5 text-[14px] text-ink outline-none placeholder:text-ink-soft focus:border-ink"
            />
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-[10px] bg-danger-bg px-3 py-2 text-[13px] text-danger">{error}</div>
      ) : null}

      <div className="flex-1" />

      <div className="pb-5">
        <Btn kind="primary" type="submit" className="w-full py-4" disabled={!canSubmit}>
          {submitting ? 'Guardando…' : 'Agregar cuenta'}
        </Btn>
      </div>
    </form>
  )
}
