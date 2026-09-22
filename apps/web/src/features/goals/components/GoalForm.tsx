import { useState } from 'react'
import { Btn, Chip } from '@/components'
import { cn } from '@/lib/cn'
import { formatMoney } from '@/lib/format'

export interface GoalFormFields {
  name: string
  emoji: string
  target: string
}

const PRESETS = [1000, 3000, 5000, 10000, 20000]
const EMOJI_PRESETS = ['🌵', '🛟', '💻', '🎁', '🌿', '✈️']

const LABEL_CLASS = 'text-sm font-medium text-ink-mid'
const INPUT_CLASS =
  'mt-1.5 w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-[15px] text-ink outline-none placeholder:text-ink-soft focus:border-accent'

interface GoalFormProps {
  submitting: boolean
  error: string | null
  onSubmit: (fields: GoalFormFields) => void
  initial?: Partial<GoalFormFields>
  submitLabel?: string
}

export function GoalForm({ submitting, error, onSubmit, initial, submitLabel }: GoalFormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [emoji, setEmoji] = useState(initial?.emoji ?? '🌿')
  const [target, setTarget] = useState(initial?.target ?? '')

  const canSubmit = name.trim() !== '' && target.trim() !== '' && !submitting

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    onSubmit({ name: name.trim(), emoji, target })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 py-2">
      <div>
        <label htmlFor="target" className={LABEL_CLASS}>
          ¿Cuánto necesitas?
        </label>
        <div className="mt-1.5 flex items-baseline gap-1.5 border-b border-line pb-2 focus-within:border-accent">
          <span className="money text-2xl font-medium text-ink">$</span>
          <input
            id="target"
            inputMode="decimal"
            autoComplete="off"
            autoFocus
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="0"
            className="money money-lg w-full bg-transparent text-3xl font-semibold leading-none tracking-tight text-ink caret-accent outline-none placeholder:font-normal placeholder:text-ink-soft"
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {PRESETS.map((v) => (
            <Chip key={v} active={target === String(v)} onClick={() => setTarget(String(v))}>
              {formatMoney(v)}
            </Chip>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="name" className={LABEL_CLASS}>
          Nombre
        </label>
        <input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
          placeholder="Ej: Vacaciones a Oaxaca"
          className={INPUT_CLASS}
        />
      </div>

      <div>
        <span className={LABEL_CLASS}>Emoji</span>
        <div className="mt-2 flex flex-wrap gap-2">
          {EMOJI_PRESETS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => setEmoji(e)}
              className={cn(
                'wf-tap flex h-12 w-12 items-center justify-center rounded-xl border text-[22px] transition-colors',
                emoji === e
                  ? 'border-accent bg-accent-bg'
                  : 'border-line bg-surface hover:bg-bg-alt',
              )}
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="rounded-xl bg-danger-bg px-3.5 py-2.5 text-sm text-danger">{error}</div>
      ) : null}

      <Btn kind="primary" type="submit" className="mt-2 w-full" disabled={!canSubmit}>
        {submitting ? 'Guardando…' : submitLabel ?? 'Crear frasco'}
      </Btn>
    </form>
  )
}
