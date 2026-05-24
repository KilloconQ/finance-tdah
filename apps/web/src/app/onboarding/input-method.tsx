import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Btn, Hello } from '@/components'
import { cn } from '@/lib/cn'
import {
  setOnboardingDraft,
  useOnboardingDraft,
  type OnboardingDraft,
} from '@/lib/onboarding-draft'
import { OnboardingLayout } from './-layout'

const OPTIONS: Array<{
  id: OnboardingDraft['inputPreference']
  emoji: string
  title: string
  sub: string
}> = [
  { id: 'voice', emoji: '🎤', title: 'Voz', sub: 'mantén el botón y habla' },
  { id: 'widget', emoji: '📱', title: 'Widget en home screen', sub: '1 tap sin abrir la app' },
  { id: 'manual', emoji: '⌨', title: 'Manual', sub: 'a la antigüita' },
]

export const Route = createFileRoute('/onboarding/input-method')({
  component: OnboardingInput,
})

function OnboardingInput() {
  const navigate = useNavigate()
  const { inputPreference: preference } = useOnboardingDraft()

  return (
    <OnboardingLayout step={4}>
      <h1 className="mt-5 text-[24px] font-medium leading-tight text-ink">
        ¿Cómo te late
        <br />
        registrar gastos?
      </h1>
      <Hello className="mt-2">Elige la que sientas más fácil. Lo cambias cuando quieras.</Hello>

      <div className="mt-4 flex flex-col gap-2.5">
        {OPTIONS.map((o) => {
          const selected = preference === o.id
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => setOnboardingDraft({ inputPreference: o.id })}
              className={cn(
                'wf-tap flex items-center gap-3 rounded-xl border-[1.5px] px-4 py-3.5 text-left',
                selected ? 'border-ink bg-bg-alt' : 'border-line bg-surface',
              )}
            >
              <span className="text-[22px]">{o.emoji}</span>
              <div className="flex-1">
                <div className="text-[14px] font-medium text-ink">{o.title}</div>
                <div className="mt-0.5 text-[12px] text-ink-mid">{o.sub}</div>
              </div>
              {selected ? <span aria-hidden className="text-[14px] text-ink">✓</span> : null}
            </button>
          )
        })}
      </div>

      <div className="flex-1" />
      <Btn
        kind="primary"
        className="mt-4 w-full py-4"
        onClick={() => navigate({ to: '/onboarding/done' })}
      >
        Siguiente
      </Btn>
    </OnboardingLayout>
  )
}
