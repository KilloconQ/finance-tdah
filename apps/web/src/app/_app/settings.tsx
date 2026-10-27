import { AmountInput } from '@/components/AmountInput'
import { useRef, useState } from 'react'
import { parseAmountToCents } from '@finance-tdah/shared/domain'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { AppBar, PhoneShell, TabBar, Btn } from '@/components'
import { cn } from '@/lib/cn'
import { setThemePreference, useThemePreference, type ThemePreference } from '@/lib/theme'
import { useSetTweak, useTweaks } from '@/lib/use-tweaks'
import { usePushSubscription } from '@/lib/use-push-subscription'
import { signOutAndClear } from '@/lib/session-reset'
import { fetchValidated } from '@/lib/api'
import { z } from 'zod'

export const Route = createFileRoute('/_app/settings')({
  component: Settings,
})

function Settings() {
  const { showBalances, weeklyBudgetCents, dailyReminderEnabled, dailyReminderHour } = useTweaks()
  const setTweak = useSetTweak()
  const saveBudget = useSetTweak()
  const push = usePushSubscription()
  const navigate = useNavigate()
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  const deleteAccount = useMutation({
    mutationFn: async () => {
      return fetchValidated(
        '/profile/delete',
        z.object({ success: z.boolean() }),
        { method: 'POST' },
      )
    },
    onSuccess: async () => {
      // The session died with the account, so the sign-out call may 401; still redirect.
      await signOutAndClear().catch(() => {})
      navigate({ to: '/auth/sign-in' })
    },
  })

  const handleLogout = async () => {
    await signOutAndClear()
    navigate({ to: '/auth/sign-in' })
  }

  return (
    <PhoneShell>
      <AppBar title="Ajustes" />

      <div className="flex w-full max-w-xl flex-1 flex-col gap-8 pb-8">
        <Section
          label="Presupuesto"
          hint="Cuánto quieres poder gastar por semana. De aquí sale el “hoy puedes gastar”."
        >
          <BudgetInput
            valueCents={weeklyBudgetCents}
            onCommit={(cents) => saveBudget.mutate({ weeklyBudgetCents: cents })}
            saved={saveBudget.isSuccess}
            saving={saveBudget.isPending}
            onEdit={saveBudget.reset}
          />
        </Section>

        <Section label="Apariencia" hint="Se guarda solo en este dispositivo.">
          <ThemePicker />
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

        {push.configured ? (
          <Section
            label="Notificaciones"
            hint="Avisos cuando llegas al presupuesto semanal, completas un frasco o no has anotado nada en el día."
          >
            {push.keyError ? (
              <div className="rounded-xl bg-danger-bg px-3 py-2 text-sm text-danger">{push.keyError}</div>
            ) : push.supported ? (
              <div className="flex flex-col gap-3">
                <Toggle
                  label="Activar notificaciones"
                  value={push.subscribed}
                  onChange={(v) => {
                    if (!v) return push.unsubscribe()
                    push.subscribe()
                    // The daily reminder goes out in this device's time zone.
                    setTweak.mutate({ timeZone: browserTimeZone() })
                  }}
                />
                {push.subscribed ? (
                  <>
                    <Toggle
                      label="Recordarme si no anoto nada en el día"
                      value={dailyReminderEnabled}
                      onChange={(v) => setTweak.mutate({ dailyReminderEnabled: v, timeZone: browserTimeZone() })}
                    />
                    {dailyReminderEnabled ? (
                      <label className="flex items-center justify-between rounded-xl border border-line bg-surface px-4 py-3 text-sm text-ink">
                        A qué hora
                        <select
                          value={dailyReminderHour}
                          onChange={(e) =>
                            setTweak.mutate({ dailyReminderHour: Number(e.target.value), timeZone: browserTimeZone() })
                          }
                          className="bg-transparent text-sm text-ink outline-none"
                        >
                          {HOURS.map((h) => (
                            <option key={h} value={h}>
                              {hourLabel(h)}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : null}
                  </>
                ) : null}
              </div>
            ) : (
              // iOS only exposes web push to apps opened from the home screen.
              <div className="rounded-xl bg-bg-alt px-3 py-2 text-sm text-ink-mid">
                En iPhone: abre la app en Safari, toca Compartir → «Agregar a pantalla de inicio» y ábrela desde
                el ícono. Ahí vas a poder activar las notificaciones.
              </div>
            )}
            {push.error ? (
              <div className="mt-2 rounded-xl bg-danger-bg px-3 py-2 text-sm text-danger">
                {push.error}
              </div>
            ) : null}
          </Section>
        ) : null}

        <div className="border-t border-line pt-8 mt-8">
          <div className="flex gap-2">
            <Btn
              kind="ghost"
              className="flex-1"
              onClick={handleLogout}
            >
              Cerrar sesión
            </Btn>
          </div>
        </div>

        {!deleteConfirm ? (
          <Btn
            kind="plain"
            className="w-full"
            onClick={() => setDeleteConfirm(true)}
          >
            Borrar cuenta
          </Btn>
        ) : (
          <div className="rounded-xl border border-danger bg-danger-bg p-4">
            <div className="mb-3 text-sm font-medium text-danger">¿Estás seguro?</div>
            <div className="mb-4 text-xs text-ink-soft">Se borrarán tu cuenta, tus gastos, frascos y suscripciones. No se puede deshacer.</div>
            <div className="flex gap-2">
              <Btn
                kind="ghost"
                className="flex-1"
                onClick={() => setDeleteConfirm(false)}
              >
                Cancelar
              </Btn>
              <Btn
                kind="danger"
                className="flex-1"
                onClick={() => deleteAccount.mutate()}
                disabled={deleteAccount.isPending}
              >
                {deleteAccount.isPending ? 'Borrando...' : 'Confirmar'}
              </Btn>
            </div>
          </div>
        )}
      </div>

      <TabBar />
    </PhoneShell>
  )
}

const HOURS = Array.from({ length: 24 }, (_, h) => h)

function hourLabel(h: number): string {
  const suffix = h < 12 ? 'am' : 'pm'
  return `${h % 12 === 0 ? 12 : h % 12}:00 ${suffix}`
}

function browserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
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

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'Sistema' },
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Oscuro' },
]

// Radio group (roving tabindex): arrows move and select, as native radios do.
function ThemePicker() {
  const current = useThemePreference()
  const refs = useRef<(HTMLButtonElement | null)[]>([])

  function onKeyDown(e: React.KeyboardEvent, index: number) {
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    if (!step) return
    e.preventDefault()
    const next = (index + step + THEME_OPTIONS.length) % THEME_OPTIONS.length
    setThemePreference(THEME_OPTIONS[next].value)
    refs.current[next]?.focus()
  }

  return (
    <div role="radiogroup" aria-label="Tema" className="flex gap-1 rounded-xl border border-line bg-bg-alt p-1">
      {THEME_OPTIONS.map((o, i) => {
        const selected = o.value === current
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => setThemePreference(o.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              'wf-tap flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              selected ? 'bg-accent-bg text-accent-strong shadow-card ring-1 ring-accent/60' : 'text-ink-mid hover:text-ink',
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

interface BudgetInputProps {
  valueCents: number
  onCommit: (cents: number) => void
  onEdit?: () => void
  saving?: boolean
  saved?: boolean
}

function BudgetInput({ valueCents, onCommit, onEdit, saving, saved }: BudgetInputProps) {
  const [draft, setDraft] = useState<string>(() => String(Math.round(valueCents / 100)))

  function handleBlur() {
    const cents = draft.trim() === '0' ? 0 : parseAmountToCents(draft)
    if (cents === null) {
      setDraft(String(Math.round(valueCents / 100)))
      return
    }
    if (cents !== valueCents) onCommit(cents)
  }

  return (
    <div>
    <div className="flex items-center gap-2 rounded-xl border border-line bg-surface px-4 py-3 transition-colors focus-within:border-accent">
      <span className="text-[15px] text-ink-soft">$</span>
      <AmountInput
        value={draft}
        onChange={(v) => {
          setDraft(v)
          onEdit?.()
        }}
        onBlur={() => {
          handleBlur()
        }}
        className="money min-h-10 w-full min-w-0 bg-transparent text-[15px] text-ink outline-none"
      />
      <span className="whitespace-nowrap text-xs text-ink-soft">/ semana</span>
    </div>
    <p role="status" className="mt-1.5 min-h-4 px-1 text-xs text-ink-soft">
      {saving ? 'Guardando…' : saved ? 'Guardado' : ''}
    </p>
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
