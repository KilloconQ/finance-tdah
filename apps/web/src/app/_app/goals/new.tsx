import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { unitsToCents } from '@finance-tdah/shared/domain'
import { X } from 'lucide-react'
import { AppBar, Btn, Chip, Dots, Hello, IconButton, PhoneShell } from '@/components'
import { useCreateGoal } from '@/features/goals'
import { cn } from '@/lib/cn'
import { formatMoney } from '@/lib/format'

const PRESETS = [1000, 3000, 5000, 10000, 20000]
const EMOJI_PRESETS = ['🌵', '🛟', '💻', '🎁', '🌿', '✈️']

export const Route = createFileRoute('/_app/goals/new')({
  component: GoalCreate,
})

function GoalCreate() {
  const navigate = useNavigate()
  const [step, setStep] = useState<0 | 1>(0)
  const [target, setTarget] = useState(5000)
  const [name, setName] = useState('Nueva meta')
  const [emoji, setEmoji] = useState('🌿')
  const [error, setError] = useState<string | null>(null)

  const createMutation = useCreateGoal()

  const handleNext = () => {
    if (step === 0) {
      setStep(1)
      return
    }
    createMutation.mutate(
      { name, emoji, targetCents: unitsToCents(target) },
      {
        onSuccess: () => navigate({ to: '/goals', replace: true }),
        onError: (err) =>
          setError(err instanceof Error ? err.message : 'No pudimos crear el frasco'),
      },
    )
  }

  return (
    <PhoneShell variant="narrow">
      <AppBar
        title="Nueva meta"
        left={
          <IconButton onClick={() => navigate({ to: '/goals' })} label="Cerrar">
            <X size={20} strokeWidth={2} />
          </IconButton>
        }
      />

      <div className="pb-4">
        <Dots total={2} filled={step + 1} size={6} gap={5} />

        {step === 0 ? (
          <>
            <h1 className="mt-6 text-xl font-semibold tracking-tight text-ink">
              ¿Cuánto necesitas?
            </h1>
            <Hello className="mt-1.5">El número que te haría feliz.</Hello>

            <div className="money mt-6 text-5xl font-semibold leading-none tracking-tight text-ink">
              {formatMoney(target)}
            </div>

            {/* Desktop: a normal input; the on-screen keypad is phone-only. */}
            <input
              type="number"
              min="0"
              step="100"
              value={target || ''}
              onChange={(e) => setTarget(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
              placeholder="0"
              className="mt-4 hidden w-full rounded-xl border border-line bg-surface px-4 py-3 text-base text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-bg md:block"
            />

            <div className="mt-4 flex flex-wrap gap-2">
              {PRESETS.map((v) => (
                <Chip key={v} active={v === target} onClick={() => setTarget(v)}>
                  {formatMoney(v)}
                </Chip>
              ))}
            </div>

            <div className="mt-6 md:hidden">
              <Numpad
                onPress={(n) => setTarget((prev) => Number(`${prev}${n}`))}
                onBack={() => setTarget((prev) => Math.floor(prev / 10))}
              />
            </div>
          </>
        ) : (
          <>
            <h1 className="mt-6 text-xl font-semibold tracking-tight text-ink">Dale un nombre.</h1>
            <Hello className="mt-1.5">Cómo lo vas a llamar en tu cabeza.</Hello>

            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-5 w-full rounded-xl border border-line bg-surface px-4 py-3 text-base text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-bg"
              placeholder="Ej: Vacaciones a Oaxaca"
            />

            <div className="mt-4">
              <div className="text-sm font-medium text-ink-mid">Emoji</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {EMOJI_PRESETS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setEmoji(e)}
                    className={cn(
                      'wf-tap flex h-12 w-12 items-center justify-center rounded-xl border text-[22px] transition-colors',
                      emoji === e
                        ? 'border-accent bg-accent-bg'
                        : 'border-line bg-surface hover:bg-bg-alt',
                    )}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {error ? (
          <div className="mt-4 rounded-xl bg-danger-bg px-3 py-2 text-sm text-danger">{error}</div>
        ) : null}

        <Btn
          kind="primary"
          className="mt-6 w-full"
          onClick={handleNext}
          disabled={createMutation.isPending}
        >
          {step === 0 ? 'Siguiente' : createMutation.isPending ? 'Creando…' : 'Crear frasco'}
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
    <div className="grid grid-cols-3 gap-1.5">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onPress(n)}
          className="wf-tap money rounded-xl border border-line bg-surface py-3 text-lg text-ink hover:bg-bg-alt"
        >
          {n}
        </button>
      ))}
      <span aria-hidden />
      <button
        type="button"
        onClick={() => onPress(0)}
        className="wf-tap money rounded-xl border border-line bg-surface py-3 text-lg text-ink hover:bg-bg-alt"
      >
        0
      </button>
      <button
        type="button"
        onClick={onBack}
        className="wf-tap money rounded-xl border border-line bg-surface py-3 text-lg text-ink hover:bg-bg-alt"
      >
        ⌫
      </button>
    </div>
  )
}
