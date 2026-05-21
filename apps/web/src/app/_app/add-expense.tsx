import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AppBar, Btn, Hello, MicButton, PhoneShell } from '@/components'
import { useAppStore } from '@/store/appStore'
import { cn } from '@/lib/cn'
import { mutations } from '@/lib/queries'
import type { ParsedVoiceExpense } from '@finance-tdah/shared/schemas'

const FAKE_TRANSCRIPTS = [
  '180 en taxi',
  'café 65',
  'super 1200 con la débito',
  'cena 320 con Lu',
]

export const Route = createFileRoute('/_app/add-expense')({
  component: AddExpense,
})

function AddExpense() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [recording, setRecording] = useState(false)
  const [confirm, setConfirm] = useState<ParsedVoiceExpense | null>(null)
  const [error, setError] = useState<string | null>(null)
  const detailed = useAppStore((s) => s.tweaks.density === 'detailed')

  const parseMutation = useMutation({
    mutationFn: async (transcript: string) => {
      const result = (await mutations.parseVoice(transcript)) as { parsed: ParsedVoiceExpense }
      return result.parsed
    },
    onSuccess: (parsed) => setConfirm(parsed),
    onError: (err) => setError(err instanceof Error ? err.message : 'No te entendí'),
  })

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!confirm) throw new Error('Nada que guardar')
      return mutations.createExpense({
        amountCents: confirm.amountCents,
        category: confirm.category,
        description: confirm.description,
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['expenses'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      void queryClient.invalidateQueries({ queryKey: ['accounts'] })
      navigate({ to: '/', replace: true })
    },
  })

  const handlePress = () => {
    setError(null)
    setRecording(true)
  }
  const handleRelease = () => {
    if (!recording) return
    setRecording(false)
    const transcript = FAKE_TRANSCRIPTS[Math.floor(Math.random() * FAKE_TRANSCRIPTS.length)]
    parseMutation.mutate(transcript)
  }

  return (
    <PhoneShell>
      <AppBar
        title="Registrar"
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

      <div className="flex flex-1 flex-col items-center justify-center px-6">
        {confirm ? (
          <ConfirmCard
            expense={confirm}
            onCancel={() => setConfirm(null)}
            onSave={() => saveMutation.mutate()}
            saving={saveMutation.isPending}
          />
        ) : (
          <>
            <Hello className="mb-7 text-center">
              Solo dilo en voz alta.
              <br />
              Yo lo entiendo.
            </Hello>
            <MicButton
              size={140}
              recording={recording || parseMutation.isPending}
              onPress={handlePress}
              onRelease={handleRelease}
              label={
                parseMutation.isPending
                  ? 'Pensando…'
                  : recording
                    ? 'Escuchando…'
                    : 'Mantén para hablar'
              }
            />
            {error ? (
              <div className="mt-4 max-w-[240px] rounded-[10px] bg-danger-bg px-3 py-2 text-center text-[12px] text-danger">
                {error}
              </div>
            ) : null}
            {detailed ? (
              <div className="mt-8 max-w-[240px] text-center text-[12px] leading-relaxed text-ink-soft">
                Ej: <span className="wf-mono">"180 en taxi"</span> ·{' '}
                <span className="wf-mono">"café 65"</span> ·{' '}
                <span className="wf-mono">"super 1200 con la débito"</span>
              </div>
            ) : null}
          </>
        )}
      </div>

      <div className={cn('px-5 pb-5 text-center', confirm && 'hidden')}>
        <button
          type="button"
          onClick={() => parseMutation.mutate('café 65')}
          className="wf-tap text-[12px] text-ink-mid underline"
        >
          o escribir manualmente
        </button>
      </div>
    </PhoneShell>
  )
}

interface ConfirmCardProps {
  expense: ParsedVoiceExpense
  onCancel: () => void
  onSave: () => void
  saving: boolean
}

function ConfirmCard({ expense, onCancel, onSave, saving }: ConfirmCardProps) {
  return (
    <div className="w-full">
      <div className="rounded-2xl border border-line bg-surface p-5">
        <div className="wf-mono text-[11px] uppercase tracking-[0.08em] text-ink-mid">
          Entendí
        </div>
        <div className="wf-mono mt-2 text-[40px] font-light leading-none tracking-[-0.02em] text-ink">
          ${(expense.amountCents / 100).toFixed(0)}
        </div>
        <div className="mt-2 text-[14px] text-ink">
          {expense.description} <span className="text-ink-mid">· {expense.category}</span>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <Btn kind="ghost" className="flex-1" onClick={onCancel}>
          Reintentar
        </Btn>
        <Btn kind="primary" className="flex-1" onClick={onSave} disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar'}
        </Btn>
      </div>
    </div>
  )
}
