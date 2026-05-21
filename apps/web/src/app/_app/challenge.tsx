import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AppBar, Btn, Dots, Hello, PhoneShell } from '@/components'
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

  const checkMutation = useMutation({
    mutationFn: (id: string) => mutations.checkChallengeDay(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['challenges'] }),
  })

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
        <div className="flex flex-1 items-center justify-center px-8 text-center text-[14px] text-ink-mid">
          Todavía no hay un reto activo.
        </div>
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
