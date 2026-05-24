import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { AppBar, Btn, Dots, Hello, PhoneShell } from '@/components'
import { Jar } from '@/features/goals'

export const Route = createFileRoute('/onboarding/')({
  component: OnboardingWelcome,
})

function OnboardingWelcome() {
  const navigate = useNavigate()
  return (
    <PhoneShell>
      <AppBar right={<span className="wf-mono text-[12px] text-ink-mid">1 / 5</span>} />
      <div className="flex flex-1 flex-col px-7 pb-6 pt-2">
        <Dots total={5} filled={1} size={6} gap={5} />
        <div className="mt-6 text-center">
          <h1 className="text-[28px] font-medium leading-tight text-ink">
            Tus finanzas,
            <br />
            sin la pereza.
          </h1>
          <Hello className="mx-auto mt-3 max-w-[260px]">
            Diseñada para mentes TDAH. Una pregunta por pantalla, y nada de tableros densos.
          </Hello>
        </div>

        <div className="mt-6 flex justify-center">
          <Jar fraction={0.6} width={150} height={200} />
        </div>

        <div className="mt-4 space-y-1.5 text-center text-[13px] text-ink-mid">
          <p>· Registra con la voz · o un widget</p>
          <p>· Frascos visuales para metas</p>
          <p>· Sin juicios, en segunda persona</p>
        </div>

        <div className="flex-1" />
        <Btn
          kind="primary"
          className="w-full py-4"
          onClick={() => navigate({ to: '/onboarding/pain-points' })}
        >
          Empezar
        </Btn>
      </div>
    </PhoneShell>
  )
}
