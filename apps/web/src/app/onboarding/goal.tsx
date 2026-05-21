import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Btn, Hello, Jar } from '@/components'
import { useAppStore } from '@/store/appStore'
import { cn } from '@/lib/cn'
import { formatMoney } from '@/lib/format'
import { OnboardingLayout } from './-layout'

const PRESETS = [
  { emoji: '🌵', name: 'Vacaciones a Oaxaca', target: 5000 },
  { emoji: '💻', name: 'Laptop nueva', target: 30000 },
  { emoji: '🛟', name: 'Cojín mensual', target: 2000 },
  { emoji: '🎁', name: 'Regalos', target: 1500 },
] as const

export const Route = createFileRoute('/onboarding/goal')({
  component: OnboardingGoal,
})

function OnboardingGoal() {
  const navigate = useNavigate()
  const setOnboarding = useAppStore((s) => s.setOnboarding)
  const [chosenIdx, setChosenIdx] = useState(0)
  const chosen = PRESETS[chosenIdx]

  const handleNext = () => {
    setOnboarding({
      firstGoal: {
        name: chosen.name,
        target: chosen.target,
        emoji: chosen.emoji,
      },
    })
    navigate({ to: '/onboarding/input-method' })
  }

  return (
    <OnboardingLayout step={3}>
      <h1 className="mt-5 text-[24px] font-medium leading-tight text-ink">
        Empecemos con
        <br />
        una sola meta.
      </h1>
      <Hello className="mt-2">Algo cortito. Algo que de verdad quieras.</Hello>

      <div className="mt-4 flex justify-center">
        <Jar fill={0.15} current={750} target={chosen.target} width={130} height={170} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {PRESETS.map((p, i) => (
          <button
            key={p.name}
            type="button"
            onClick={() => setChosenIdx(i)}
            className={cn(
              'wf-tap rounded-xl border px-3 py-2.5 text-left',
              chosenIdx === i ? 'border-ink bg-bg-alt' : 'border-line bg-surface',
            )}
          >
            <div className="text-[13px] font-medium text-ink">
              {p.emoji} {p.name}
            </div>
            <div className="wf-mono mt-0.5 text-[11px] text-ink-mid">{formatMoney(p.target)}</div>
          </button>
        ))}
      </div>

      <div className="flex-1" />
      <Btn kind="primary" className="w-full py-4" onClick={handleNext}>
        Crear meta
      </Btn>
      <Btn kind="plain" className="mt-1 w-full" onClick={() => navigate({ to: '/onboarding/input-method' })}>
        Después
      </Btn>
    </OnboardingLayout>
  )
}
