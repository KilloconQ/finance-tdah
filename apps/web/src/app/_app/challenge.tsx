import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AppBar, Btn, Dots, Hello, PhoneShell, TabBar } from '@/components'
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
        <AppBar
          title="Reto de la semana"
          left={
            <button
              type="button"
              onClick={() => navigate({ to: '..' })}
              className="wf-tap text-[16px] text-ink"
            >
              ←
            </button>
          }
        />
        <div className="flex flex-1 flex-col overflow-y-auto px-6 pb-4 pt-4">
          <h1 className="text-[22px] font-medium leading-tight text-ink">Crea un reto</h1>
          <Hello className="mt-1.5">Un hábito pequeño que cambia todo.</Hello>

          <div className="mt-5 space-y-3">
            <div>
              <label className="wf-mono block text-[11px] uppercase tracking-[0.08em] text-ink-mid">
                Nombre del reto
              </label>
              <input
                type="text"
                value={challengeName}
                onChange={(e) => setChallengeName(e.target.value)}
                placeholder="Ej: No gastar en café"
                className="mt-1.5 w-full rounded-[10px] border border-line bg-surface px-4 py-3 text-[15px] text-ink focus:border-ink focus:outline-none"
              />
            </div>

            <div>
              <label className="wf-mono block text-[11px] uppercase tracking-[0.08em] text-ink-mid">
                Descripción
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ej: Evitar comprar café fuera de casa durante la semana"
                rows={3}
                className="mt-1.5 w-full resize-none rounded-[10px] border border-line bg-surface px-4 py-3 text-[15px] text-ink focus:border-ink focus:outline-none"
              />
            </div>

            <div>
              <label className="wf-mono block text-[11px] uppercase tracking-[0.08em] text-ink-mid">
                Duración (días)
              </label>
              <input
                type="number"
                value={days}
                onChange={(e) => setDays(Math.max(1, Math.min(30, parseInt(e.target.value) || 7)))}
                min={1}
                max={30}
                className="mt-1.5 w-full rounded-[10px] border border-line bg-surface px-4 py-3 text-[15px] text-ink focus:border-ink focus:outline-none"
              />
            </div>

            <div>
              <label className="wf-mono block text-[11px] uppercase tracking-[0.08em] text-ink-mid">
                Ahorro esperado (en pesos)
              </label>
              <input
                type="number"
                value={savings}
                onChange={(e) => setSavings(e.target.value)}
                placeholder="0"
                min="0"
                step="0.01"
                className="mt-1.5 w-full rounded-[10px] border border-line bg-surface px-4 py-3 text-[15px] text-ink focus:border-ink focus:outline-none"
              />
            </div>
          </div>

          <div className="flex-1" />

          {formError ? (
            <div className="mb-3 rounded-[10px] bg-danger-bg px-3 py-2 text-[13px] text-danger">
              {formError}
            </div>
          ) : null}

          <Btn
            kind="primary"
            className="mt-4 w-full py-3.5"
            onClick={handleCreateChallenge}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? 'Creando…' : 'Empezar reto'}
          </Btn>
        </div>
        <TabBar />
      </PhoneShell>
    )
  }

  const savedSoFarCents = Math.round(
    (challenge.expectedSavingsCents / challenge.days) * challenge.doneDays,
  )

  return (
    <PhoneShell>
      <AppBar
        title="Reto de la semana"
        left={
          <button
            type="button"
            onClick={() => navigate({ to: '..' })}
            className="wf-tap text-[16px] text-ink"
          >
            ←
          </button>
        }
      />

      <div className="flex flex-1 flex-col px-6">
        <div className="py-2 text-center">
          <div className="wf-mono text-[11px] uppercase tracking-[0.08em] text-ink-mid">
            {challenge.doneDays} / {challenge.days}
          </div>
          <div className="mt-3 text-[56px]">☕</div>
          <h1 className="mt-2 text-[22px] font-medium leading-tight text-ink">
            {challenge.name}
            <br />
            esta semana
          </h1>
          <Hello className="mt-2.5">{challenge.description}</Hello>
        </div>

        <div className="mt-4 rounded-xl border border-line bg-surface px-4 py-3.5">
          <div className="wf-mono text-[11px] uppercase tracking-[0.08em] text-ink-mid">
            Día {challenge.doneDays} / {challenge.days}
          </div>
          <div className="mt-2.5">
            <Dots total={challenge.days} filled={challenge.doneDays} size={14} gap={6} />
          </div>
          <div className="mt-2.5 text-[12px] text-ink-mid">
            Llevas <span className="wf-mono text-good">{challenge.doneDays} días</span> · vas
            ahorrando <span className="wf-mono text-ink">${(savedSoFarCents / 100).toFixed(0)}</span>
          </div>
        </div>

        <div className="flex-1" />

        <div className="flex gap-2 pb-4">
          <Btn kind="ghost" className="flex-1">
            Saltar
          </Btn>
          <Btn
            kind="primary"
            className="flex-[2]"
            onClick={() => checkMutation.mutate(challenge.id)}
            disabled={checkMutation.isPending}
          >
            {checkMutation.isPending ? '…' : 'Sigo en el reto 💪'}
          </Btn>
        </div>
      </div>
    </PhoneShell>
  )
}
