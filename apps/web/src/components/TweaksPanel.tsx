import { useState } from 'react'
import { useAppStore } from '@/store/appStore'
import { cn } from '@/lib/cn'

export function TweaksPanel() {
  const [open, setOpen] = useState(false)
  const tweaks = useAppStore((s) => s.tweaks)
  const setTweak = useAppStore((s) => s.setTweak)

  return (
    <div className="pointer-events-none fixed right-3 top-3 z-40 flex justify-end md:right-4 md:top-auto md:bottom-4">
      <div className="pointer-events-auto">
        {open ? (
          <div className="w-[260px] rounded-2xl border border-line bg-surface p-4 shadow-md">
            <div className="flex items-center justify-between">
              <div className="wf-mono text-[11px] uppercase tracking-[0.08em] text-ink-mid">
                Tweaks
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="wf-tap text-[14px] text-ink-mid"
              >
                ✕
              </button>
            </div>

            <Section label="Modo global" />
            <Radio
              label="Densidad"
              value={tweaks.density}
              options={[
                { value: 'simple', label: 'simple' },
                { value: 'detailed', label: 'detallado' },
              ]}
              onChange={(v) => setTweak('density', v as typeof tweaks.density)}
            />

            <Section label="Privacidad" />
            <Toggle
              label="Mostrar saldos"
              value={tweaks.showBalances}
              onChange={(v) => setTweak('showBalances', v)}
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="wf-tap rounded-full border border-line bg-surface px-4 py-2 text-[12px] font-medium text-ink shadow-sm"
          >
            ⚙ Tweaks
          </button>
        )}
      </div>
    </div>
  )
}

function Section({ label }: { label: string }) {
  return (
    <div className="wf-mono mt-3 text-[10px] uppercase tracking-[0.08em] text-ink-soft">
      {label}
    </div>
  )
}

interface RadioProps {
  label: string
  value: string
  options: Array<{ value: string; label: string }>
  onChange: (value: string) => void
}

function Radio({ label, value, options, onChange }: RadioProps) {
  return (
    <div className="mt-1.5">
      <div className="text-[12px] text-ink-mid">{label}</div>
      <div className="mt-1.5 flex gap-1.5">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={cn(
              'wf-tap flex-1 rounded-md border px-2 py-1.5 text-[12px]',
              value === o.value
                ? 'border-ink bg-ink text-surface'
                : 'border-line bg-surface text-ink-mid',
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
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
      onClick={() => onChange(!value)}
      className="mt-1.5 flex w-full items-center justify-between rounded-md border border-line bg-surface px-3 py-1.5 text-left"
    >
      <span className="text-[12px] text-ink">{label}</span>
      <span
        aria-hidden
        className={cn(
          'inline-block h-4 w-7 rounded-full transition-colors',
          value ? 'bg-ink' : 'bg-line',
        )}
      >
        <span
          className={cn(
            'block h-3.5 w-3.5 translate-y-[1px] rounded-full bg-surface transition-transform',
            value ? 'translate-x-[14px]' : 'translate-x-[1px]',
          )}
        />
      </span>
    </button>
  )
}
