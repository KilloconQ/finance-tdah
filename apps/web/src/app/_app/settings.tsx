import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { AppBar, PhoneShell, TabBar, Btn } from '@/components'
import { cn } from '@/lib/cn'
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
      await signOutAndClear()
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
            onCommit={(cents) => setTweak.mutate({ weeklyBudgetCents: cents })}
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

        {push.configured ? (
          <Section
            label="Notificaciones"
            hint="Avisos cuando llegas al presupuesto semanal, completas una meta o no has anotado nada en el día."
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
            <div className="mb-4 text-xs text-ink-soft">Esta acción no se puede deshacer.</div>
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
