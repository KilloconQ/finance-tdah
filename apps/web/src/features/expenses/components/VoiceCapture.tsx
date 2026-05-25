import type { ParsedVoiceExpense } from '@finance-tdah/shared/schemas'
import { Btn, Hello, MicButton } from '@/components'

interface VoiceCaptureProps {
  recording: boolean
  pending: boolean
  parsed: ParsedVoiceExpense | null
  error: string | null
  detailed: boolean
  saving: boolean
  onPress: () => void
  onRelease: () => void
  onRetry: () => void
  onSave: () => void
  onUseManual: () => void
}

export function VoiceCapture({
  recording,
  pending,
  parsed,
  error,
  detailed,
  saving,
  onPress,
  onRelease,
  onRetry,
  onSave,
  onUseManual,
}: VoiceCaptureProps) {
  if (parsed) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6">
        <div className="w-full">
          <div className="rounded-2xl border border-line bg-surface p-5">
            <div className="wf-mono text-[11px] uppercase tracking-[0.08em] text-ink-mid">
              Entendí
            </div>
            <div className="wf-mono mt-2 text-[40px] font-light leading-none tracking-[-0.02em] text-ink">
              ${(parsed.amountCents / 100).toFixed(0)}
            </div>
            <div className="mt-2 text-[14px] text-ink">
              {parsed.description} <span className="text-ink-mid">· {parsed.category}</span>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Btn kind="ghost" className="flex-1" onClick={onRetry}>
              Reintentar
            </Btn>
            <Btn kind="primary" className="flex-1" onClick={onSave} disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar'}
            </Btn>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6">
      <Hello className="mb-7 text-center">
        Solo dilo en voz alta.
        <br />
        Yo lo entiendo.
      </Hello>
      <MicButton
        size={140}
        recording={recording || pending}
        onPress={onPress}
        onRelease={onRelease}
        label={pending ? 'Pensando…' : recording ? 'Escuchando…' : 'Mantén para hablar'}
      />
      {error ? (
        <div className="mt-4 max-w-[240px] rounded-[10px] bg-danger-bg px-3 py-2 text-center text-[12px] text-danger">
          {error}
        </div>
      ) : null}
      {detailed ? (
        <div className="mt-8 max-w-[240px] text-center text-[12px] leading-relaxed text-ink-soft">
          Ej: <span className="wf-mono">"180 en taxi"</span> ·{' '}
          <span className="wf-mono">"café 65"</span>
        </div>
      ) : null}
      <button
        type="button"
        onClick={onUseManual}
        className="wf-tap mt-8 text-[12px] text-ink-mid underline"
      >
        o escribir manualmente
      </button>
    </div>
  )
}
