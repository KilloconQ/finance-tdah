import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Btn, Hello } from '@/components'
import { mutations } from '@/lib/queries'
import { authClient } from '@/lib/auth-client'
import { clearOnboardingDraft, useOnboardingDraft } from '@/lib/onboarding-draft'
import { OnboardingLayout } from './-layout'

export const Route = createFileRoute('/onboarding/done')({
  component: OnboardingDone,
})

function OnboardingDone() {
  const navigate = useNavigate()
  const draft = useOnboardingDraft()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const finish = async () => {
    setSubmitting(true)
    setError(null)
    try {
      const session = await authClient.getSession()
      const displayName = session.data?.user.name ?? 'Tú'

      await mutations.completeOnboarding({
        displayName,
        pain: draft.pain,
        inputPreference: draft.inputPreference,
        firstGoal: draft.firstGoal
          ? {
              name: draft.firstGoal.name,
              emoji: draft.firstGoal.emoji,
              targetCents: draft.firstGoal.target * 100,
            }
          : undefined,
      })

      clearOnboardingDraft()
      navigate({ to: '/', replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos guardar tu setup')
      setSubmitting(false)
    }
  }

  return (
    <OnboardingLayout step={5}>
      <div className="mt-10 text-center">
        <div className="text-[48px]">🌿</div>
        <h1 className="mt-4 text-[24px] font-medium leading-tight text-ink">
          Listo.
          <br />
          Vamos a ir paso a paso.
        </h1>
        <Hello className="mx-auto mt-3 max-w-[280px]">
          Cero tableros. Una pregunta por pantalla. Cuando te sientas list@, abrimos detallado.
        </Hello>
      </div>

      {error ? (
        <div className="mt-6 rounded-[10px] bg-danger-bg px-3 py-2 text-[13px] text-danger">
          {error}
        </div>
      ) : null}

      <div className="flex-1" />
      <Btn kind="primary" className="w-full py-4" onClick={finish} disabled={submitting}>
        {submitting ? 'Guardando…' : 'Entrar a la app'}
      </Btn>
    </OnboardingLayout>
  )
}
