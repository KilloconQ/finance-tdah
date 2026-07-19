import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AppBar, Btn, Dots, Hello, Money, PhoneShell } from '@/components'
import { activeChallengeQuery, mutations } from '@/lib/queries'
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
  const [days, setDays] = useState(7)
  const [savings, setSavings] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  const checkMutation = useMutation({
    mutationFn: (id: string) => mutations.checkChallengeDay(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['challenges'] }),
  })

  const failMutation = useMutation({
    mutationFn: (id: string) => mutations.failChallenge(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['challenges'] }),
  })

  const createMutation = useMutation({
    mutationFn: () =>
      mutations.createChallenge({
        name: challengeName,
        description,
        days,
        expectedSavingsCents: Math.round(parseFloat(savings || '0') * 100),
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
                value={days}
                onChange={(e) => setDays(Math.max(1, Math.min(30, parseInt(e.target.value) || 7)))}
                min={1}
                max={30}
                className={INPUT_CLASS}
              />
            </Field>

            <Field label="Ahorro esperado (en pesos)">
              <input
                type="number"
                value={savings}
                onChange={(e) => setSavings(e.target.value)}
                placeholder="0"
                min="0"
                step="0.01"
                className={INPUT_CLASS}
              />
            </Field>
          </div>

          {formError ? (
            <div className="mt-4 rounded-xl bg-danger-bg px-3 py-2 text-sm text-danger">
              {formError}
            </div>
          ) : null}

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

  return (
    <PhoneShell>
      <AppBar title="Reto de la semana" back onBack={() => navigate({ to: '..' })} />

      <div className="w-full max-w-lg pb-8">
        <div className="text-center sm:text-left">
          <div className="text-xs font-medium uppercase tracking-wide text-ink-soft">
            {challenge.doneDays} / {challenge.days} días
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
            Llevas <span className="font-medium text-good">{challenge.doneDays} días</span> · vas
            ahorrando <Money value={savedSoFarCents / 100} className="text-ink" />
          </div>
        </div>

        <div className="mt-6 flex gap-2">
          <Btn
            kind="ghost"
            className="flex-1 sm:flex-none sm:min-w-32"
            onClick={() => failMutation.mutate(challenge.id)}
            disabled={failMutation.isPending || checkMutation.isPending}
          >
            {failMutation.isPending ? '…' : 'Saltar'}
          </Btn>
          <Btn
            kind="primary"
            className="flex-[2] sm:flex-none sm:min-w-48"
            onClick={() => checkMutation.mutate(challenge.id)}
            disabled={checkMutation.isPending || failMutation.isPending}
          >
            {checkMutation.isPending ? '…' : 'Sigo en el reto 💪'}
          </Btn>
        </div>
      </div>
    </PhoneShell>
  )
}

const INPUT_CLASS =
  'w-full rounded-xl border border-line bg-surface px-4 py-3 text-[15px] text-ink outline-none transition-colors focus:border-accent'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink-mid">{label}</span>
      {children}
    </label>
  )
}
