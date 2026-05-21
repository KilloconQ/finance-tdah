import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Btn, Hello } from '@/components'
import { useAppStore } from '@/store/appStore'
import { cn } from '@/lib/cn'
import { OnboardingLayout } from './-layout'

const OPTIONS = [
  { id: 'impulso', emoji: '🌪', label: 'Gasto de impulso' },
  { id: 'olvido', emoji: '🫥', label: 'Olvido en qué gasté' },
  { id: 'subs', emoji: '🔁', label: 'Suscripciones que ya no uso' },
  { id: 'saldo', emoji: '😵‍💫', label: 'No sé cuánto tengo realmente' },
  { id: 'pago', emoji: '⏰', label: 'Pago tarjetas tarde' },
] as const

export const Route = createFileRoute('/onboarding/pain-points')({
  component: OnboardingPain,
})

function OnboardingPain() {
  const navigate = useNavigate()
  const pain = useAppStore((s) => s.onboarding.pain)
  const setOnboarding = useAppStore((s) => s.setOnboarding)

  const toggle = (id: string) => {
    setOnboarding({
      pain: pain.includes(id) ? pain.filter((p) => p !== id) : [...pain, id],
    })
  }

  return (
    <OnboardingLayout step={2}>
      <h1 className="mt-7 text-[26px] font-medium leading-tight text-ink">
        ¿Qué te cuesta más
        <br />
        con el dinero?
      </h1>
      <Hello className="mt-2.5">Sin juicios. Pueden ser varias.</Hello>

      <div className="mt-6 flex flex-col gap-2">
        {OPTIONS.map((o) => {
          const selected = pain.includes(o.id)
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => toggle(o.id)}
              className={cn(
                'wf-tap flex items-center gap-3 rounded-xl border-[1.5px] px-4 py-3.5 text-left',
                selected ? 'border-ink bg-bg-alt' : 'border-line bg-surface',
              )}
            >
              <span className="text-[18px]">{o.emoji}</span>
              <span className="flex-1 text-[14px] font-medium text-ink">{o.label}</span>
              {selected ? <span aria-hidden className="text-[14px] text-ink">✓</span> : null}
            </button>
          )
        })}
      </div>

      <div className="flex-1" />
      <Btn kind="primary" className="mt-5 w-full py-4" onClick={() => navigate({ to: '/onboarding/goal' })}>
        Siguiente
      </Btn>
    </OnboardingLayout>
  )
}
