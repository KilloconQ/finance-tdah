import { useState } from 'react'
import { amountFormatError, parseAmountToCents } from '@finance-tdah/shared/domain'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AppBar, Btn, Dots, Hello, Money, PhoneShell } from '@/components'
import { activeChallengeQuery, mutations } from '@/lib/queries'
import { formatDays } from '@/lib/format'
import { queryClient } from '@/lib/query-client'

export const Route = createFileRoute('/_app/challenge')({
  loader: () => queryClient.ensureQueryData(activeChallengeQuery()),
  component: Challenge,
})

function Challenge() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: challenge } = useQuery(activeChallengeQuery())

  const [challengeName, setChallengeName] = useState('')
  const [description, setDescription] = useState('')
  const [daysInput, setDaysInput] = useState('7')
  const parsedDays = parseInt(daysInput)
  const days = Number.isNaN(parsedDays) ? 7 : Math.max(1, Math.min(30, parsedDays))
  const [savings, setSavings] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const checkMutation = useMutation({
    mutationFn: (id: string) => mutations.checkChallengeDay(id),
    onMutate: () => setActionError(null),
    onError: (err) =>
      setActionError(err instanceof Error ? err.message : 'No pudimos marcar el día'),
    onSuccess: playCheckSound,
    // refetch on failure too, so a 409 "already checked" locks the button
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['challenges'] }),
  })

  const resetMutation = useMutation({
    mutationFn: (id: string) => mutations.resetChallenge(id),
    onMutate: () => setActionError(null),
    onError: (err) =>
      setActionError(err instanceof Error ? err.message : 'No pudimos saltar el reto'),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['challenges'] }),
  })

  const createMutation = useMutation({
    mutationFn: () =>
      mutations.createChallenge({
        name: challengeName,
        description,
        days,
        expectedSavingsCents: savings.trim() === '' ? 0 : (parseAmountToCents(savings) ?? 0),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['challenges'] })
    },
    onError: (err) =>
      setFormError(err instanceof Error ? err.message : 'No pudimos crear el reto'),
  })

  const handleCreateChallenge = () => {
    setFormError(null)
    if (!challengeName.trim()) { setFormError('El nombre es obligatorio'); return }
    if (!description.trim()) { setFormError('La descripción es obligatoria'); return }
    if (savings.trim() !== '' && parseAmountToCents(savings) === null) {
      setFormError(amountFormatError(savings) ?? 'El ahorro esperado no es válido')
      return
    }
    createMutation.mutate()
  }

  if (!challenge) {
    return (
      <PhoneShell>
        <AppBar title="Reto de la semana" back onBack={() => navigate({ to: '..' })} />

        <div className="w-full max-w-lg pb-8">
          <h1 className="text-xl font-semibold tracking-tight text-ink">Crea un reto</h1>
          <Hello className="mt-1.5">Un hábito pequeño que cambia todo.</Hello>

          <div className="mt-6 space-y-4">
            <Field label="Nombre del reto">
              <input
                type="text"
                value={challengeName}
                onChange={(e) => setChallengeName(e.target.value)}
                placeholder="Ej: No gastar en café"
                className={INPUT_CLASS}
              />
            </Field>

            <Field label="Descripción">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ej: Evitar comprar café fuera de casa durante la semana"
                rows={3}
                className={`${INPUT_CLASS} resize-none`}
              />
            </Field>

            <Field label="Duración (días)">
              <input
                type="number"
                value={daysInput}
                onChange={(e) => setDaysInput(e.target.value)}
                onBlur={() => setDaysInput(String(days))}
                min={1}
                max={30}
                className={INPUT_CLASS}
              />
            </Field>

            <Field label="Ahorro esperado (en pesos)">
              <input
                type="text"
                inputMode="decimal"
                value={savings}
                onChange={(e) => setSavings(e.target.value)}
                placeholder="0"
                className={INPUT_CLASS}
              />
            </Field>
          </div>

          <ErrorBanner message={formError} />

          <Btn
            kind="primary"
            className="mt-6 w-full sm:w-auto sm:min-w-48"
            onClick={handleCreateChallenge}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? 'Creando…' : 'Empezar reto'}
          </Btn>
        </div>
      </PhoneShell>
    )
  }

  const savedSoFarCents = Math.round(
    (challenge.expectedSavingsCents / challenge.days) * challenge.doneDays,
  )
  const checkedToday = challenge.lastCheckedAt === new Date().toISOString().slice(0, 10)

  return (
    <PhoneShell>
      <AppBar title="Reto de la semana" back onBack={() => navigate({ to: '..' })} />

      <div className="w-full max-w-lg pb-8">
        <div className="text-center sm:text-left">
          <div className="text-xs font-medium uppercase tracking-wide text-ink-soft">
            {challenge.doneDays} / {formatDays(challenge.days)}
          </div>
          <div className="mt-3 text-6xl sm:text-5xl">☕</div>
          <h1 className="mt-3 text-xl font-semibold tracking-tight text-ink">
            {challenge.name}
          </h1>
          <Hello className="mt-2">{challenge.description}</Hello>
        </div>

        <div className="mt-6 rounded-2xl border border-line bg-surface p-4 shadow-card sm:p-5">
          <div className="text-sm font-medium text-ink-mid">
            Día {challenge.doneDays} de {challenge.days}
          </div>
          <div className="mt-3">
            <Dots total={challenge.days} filled={challenge.doneDays} size={14} gap={6} />
          </div>
          <div className="mt-3 text-sm text-ink-mid">
            Llevas <span className="font-medium text-good">{formatDays(challenge.doneDays)}</span> · vas
            ahorrando <Money value={savedSoFarCents / 100} className="text-ink" />
          </div>
        </div>

        <ErrorBanner message={actionError} />

        <div className="mt-6 flex gap-2">
          <Btn
            kind="ghost"
            className="flex-1 sm:flex-none sm:min-w-32"
            onClick={() => resetMutation.mutate(challenge.id)}
            disabled={resetMutation.isPending || checkMutation.isPending}
          >
            {resetMutation.isPending ? '…' : 'Reiniciar'}
          </Btn>
          <Btn
            kind="primary"
            className="flex-[2] sm:flex-none sm:min-w-48"
            onClick={() => checkMutation.mutate(challenge.id)}
            disabled={checkMutation.isPending || resetMutation.isPending || checkedToday}
          >
            {checkMutation.isPending ? '…' : checkedToday ? 'Ya marcaste hoy ✓' : 'Sigo en el reto 💪'}
          </Btn>
        </div>
      </div>
    </PhoneShell>
  )
}

function playCheckSound() {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(660, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12)
    gain.gain.setValueAtTime(0.15, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
    osc.start()
    osc.stop(ctx.currentTime + 0.3)
  } catch {
    // ponytail: best-effort chime, ignore if AudioContext is unavailable/blocked
  }
}

const INPUT_CLASS =
  'w-full rounded-xl border border-line bg-surface px-4 py-3 text-[15px] text-ink outline-none transition-colors focus:border-accent'

function ErrorBanner({ message }: { message: string | null }) {
  return message ? (
    <div role="alert" className="mt-4 rounded-xl bg-danger-bg px-3 py-2 text-sm text-danger">
      {message}
    </div>
  ) : null
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink-mid">{label}</span>
      {children}
    </label>
  )
}
