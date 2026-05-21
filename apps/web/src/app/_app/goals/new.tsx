import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AppBar, Btn, Chip, Dots, Hello, PhoneShell } from '@/components'
import { cn } from '@/lib/cn'
import { formatMoney } from '@/lib/format'
import { mutations } from '@/lib/queries'

const PRESETS = [1000, 3000, 5000, 10000, 20000]
const EMOJI_PRESETS = ['🌵', '🛟', '💻', '🎁', '🌿', '✈️']

export const Route = createFileRoute('/_app/goals/new')({
  component: GoalCreate,
})

function GoalCreate() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [step, setStep] = useState<0 | 1>(0)
  const [target, setTarget] = useState(5000)
  const [name, setName] = useState('Nueva meta')
  const [emoji, setEmoji] = useState('🌿')
  const [error, setError] = useState<string | null>(null)

  const createMutation = useMutation({
    mutationFn: mutations.createGoal,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['goals'] })
      navigate({ to: '/goals', replace: true })
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'No pudimos crear el frasco')
    },
  })

  const handleNext = () => {
    if (step === 0) {
      setStep(1)
      return
    }
    createMutation.mutate({ name, emoji, targetCents: target * 100 })
  }

  return (
    <PhoneShell>
      <AppBar
        title="Nueva meta"
        left={
          <button
            type="button"
            onClick={() => navigate({ to: '..' })}
            className="wf-tap text-[16px] text-ink"
          >
            ✕
          </button>
        }
      />

      <div className="flex flex-1 flex-col overflow-y-auto px-6 pb-4 pt-2">
        <Dots total={2} filled={step + 1} size={6} gap={5} />

        {step === 0 ? (
          <>
            <h1 className="mt-6 text-[24px] font-medium leading-tight text-ink">
              ¿Cuánto necesitas?
            </h1>
            <Hello className="mt-1.5">El número que te haría feliz.</Hello>

            <div className="wf-mono mt-6 text-[56px] font-light leading-none tracking-[-0.03em] text-ink">
              {formatMoney(target)}
              <span aria-hidden className="text-ink-ghost" style={{ animation: 'blink 1s infinite' }}>
                |
              </span>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {PRESETS.map((v) => (
                <Chip key={v} active={v === target} onClick={() => setTarget(v)}>
                  {formatMoney(v)}
                </Chip>
              ))}
            </div>

            <div className="flex-1" />
            <Numpad
              onPress={(n) => setTarget((prev) => Number(`${prev}${n}`))}
              onBack={() => setTarget((prev) => Math.floor(prev / 10))}
            />
          </>
        ) : (
          <>
            <h1 className="mt-6 text-[24px] font-medium leading-tight text-ink">
              Dale un nombre.
            </h1>
            <Hello className="mt-1.5">Cómo lo vas a llamar en tu cabeza.</Hello>

            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-5 w-full rounded-[10px] border border-line bg-surface px-4 py-3 text-[15px] text-ink focus:border-ink focus:outline-none"
              placeholder="Ej: Vacaciones a Oaxaca"
            />

            <div className="mt-4">
              <div className="wf-mono text-[11px] uppercase tracking-[0.08em] text-ink-mid">
                Emoji
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {EMOJI_PRESETS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setEmoji(e)}
                    className={cn(
                      'wf-tap flex h-12 w-12 items-center justify-center rounded-xl border text-[22px]',
                      emoji === e ? 'border-ink bg-bg-alt' : 'border-line bg-surface',
                    )}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1" />
          </>
        )}

        {error ? (
          <div className="mb-3 rounded-[10px] bg-danger-bg px-3 py-2 text-[13px] text-danger">
            {error}
          </div>
        ) : null}

        <Btn
          kind="primary"
          className="mt-3 w-full py-3.5"
          onClick={handleNext}
          disabled={createMutation.isPending}
        >
          {step === 0
            ? 'Siguiente'
            : createMutation.isPending
              ? 'Creando…'
              : 'Crear frasco'}
        </Btn>
      </div>
    </PhoneShell>
  )
}

interface NumpadProps {
  onPress: (n: number) => void
  onBack: () => void
}

function Numpad({ onPress, onBack }: NumpadProps) {
  return (
    <div className="grid grid-cols-3 gap-1.5 pb-3">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onPress(n)}
          className="wf-tap wf-mono rounded-[10px] border border-line bg-surface py-3 text-[18px] text-ink"
        >
          {n}
        </button>
      ))}
      <span aria-hidden />
      <button
        type="button"
        onClick={() => onPress(0)}
        className="wf-tap wf-mono rounded-[10px] border border-line bg-surface py-3 text-[18px] text-ink"
      >
        0
      </button>
      <button
        type="button"
        onClick={onBack}
        className="wf-tap wf-mono rounded-[10px] border border-line bg-surface py-3 text-[18px] text-ink"
      >
        ⌫
      </button>
    </div>
  )
}
