import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { AppBar, PhoneShell, TabBar } from '@/components'
import { cn } from '@/lib/cn'
import { useSetTweak, useTweaks } from '@/lib/use-tweaks'

export const Route = createFileRoute('/_app/settings')({
  component: Settings,
})

function Settings() {
  const { showBalances, density, weeklyBudgetCents } = useTweaks()
  const setTweak = useSetTweak()

  return (
    <PhoneShell>
      <AppBar title="Ajustes" />

      <div className="flex w-full max-w-xl flex-1 flex-col gap-8 pb-8">
        <Section
          label="Presupuesto"
          hint="Cuánto querés poder gastar por semana. De acá sale el “hoy puedes gastar”."
        >
          <BudgetInput
            valueCents={weeklyBudgetCents}
            onCommit={(cents) => setTweak.mutate({ weeklyBudgetCents: cents })}
          />
        </Section>

        <Section
          label="Vista"
          hint="“Detallado” suma tarjetas con el gasto y la meta de la semana."
        >
          <Radio
            value={density}
            options={[
              { value: 'simple', label: 'Simple' },
              { value: 'detailed', label: 'Detallado' },
            ]}
            onChange={(v) => setTweak.mutate({ densityMode: v as 'simple' | 'detailed' })}
          />
        </Section>

        <Section
          label="Privacidad"
          hint="Oculta los montos en pantalla (los reemplaza por ••••)."
        >
          <Toggle
            label="Mostrar saldos"
            value={showBalances}
            onChange={(v) => setTweak.mutate({ showBalances: v })}
          />
        </Section>
      </div>

      <TabBar />
    </PhoneShell>
  )
}

interface SectionProps {
  label: string
  hint?: string
  children: React.ReactNode
}

function Section({ label, hint, children }: SectionProps) {
  return (
    <div>
      <div className="text-sm font-medium text-ink">{label}</div>
      {hint ? <div className="mt-1 text-xs text-ink-soft">{hint}</div> : null}
      <div className="mt-3">{children}</div>
    </div>
  )
}

interface RadioProps {
  value: string
  options: Array<{ value: string; label: string }>
  onChange: (value: string) => void
}

function Radio({ value, options, onChange }: RadioProps) {
  return (
    <div className="flex gap-2" role="radiogroup">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'wf-tap flex-1 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors',
            value === o.value
              ? 'border-accent bg-accent text-surface'
              : 'border-line bg-surface text-ink-mid hover:bg-bg-alt',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

interface BudgetInputProps {
  valueCents: number
  onCommit: (cents: number) => void
}

function BudgetInput({ valueCents, onCommit }: BudgetInputProps) {
  const [draft, setDraft] = useState<string>(() => String(Math.round(valueCents / 100)))

  function handleBlur() {
    const pesos = parseFloat(draft)
    if (!Number.isFinite(pesos) || pesos < 0) {
      setDraft(String(Math.round(valueCents / 100)))
      return
    }
    const cents = Math.round(pesos * 100)
    if (cents !== valueCents) onCommit(cents)
  }

  return (
    <div className="flex items-center gap-2 rounded-xl border border-line bg-surface px-4 py-3 transition-colors focus-within:border-accent">
      <span className="text-[15px] text-ink-soft">$</span>
      <input
        type="number"
        min={0}
        step={100}
        inputMode="decimal"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={handleBlur}
        className="money w-full min-w-0 bg-transparent text-[15px] text-ink outline-none"
      />
      <span className="whitespace-nowrap text-xs text-ink-soft">/ semana</span>
    </div>
  )
}

interface ToggleProps {
  label: string
  value: boolean
  onChange: (value: boolean) => void
}

function Toggle({ label, value, onChange }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className="flex w-full items-center justify-between rounded-xl border border-line bg-surface px-4 py-3 text-left transition-colors hover:bg-bg-alt"
    >
      <span className="text-sm text-ink">{label}</span>
      <span
        aria-hidden
        className={cn(
          'inline-block h-5 w-9 rounded-full transition-colors',
          value ? 'bg-accent' : 'bg-line',
        )}
      >
        <span
          className={cn(
            'block h-4 w-4 translate-y-[2px] rounded-full bg-surface transition-transform',
            value ? 'translate-x-[18px]' : 'translate-x-[2px]',
          )}
        />
      </span>
    </button>
  )
}
