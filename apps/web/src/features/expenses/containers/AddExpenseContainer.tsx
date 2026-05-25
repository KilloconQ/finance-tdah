import { useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import type { CreateExpenseInput, ParsedVoiceExpense } from '@finance-tdah/shared/schemas'
import { parseAmountToCents } from '@finance-tdah/shared/domain'
import { AppBar, PhoneShell } from '@/components'
import { accountsQuery } from '@/lib/queries'
import { useTweaks } from '@/lib/use-tweaks'
import { useCreateExpense, useParseVoice } from '../api'
import { ExpenseForm, type ExpenseFormFields } from '../components/ExpenseForm'
import { VoiceCapture } from '../components/VoiceCapture'

// Voice is a deferred MVP feature: until real speech-to-text lands, the mic
// replays one of these canned transcripts so the flow stays demoable.
const STUB_TRANSCRIPTS = ['180 en taxi', 'café 65', 'super 1200 con la débito', 'cena 320 con Lu']

type Mode = 'voice' | 'manual'

export function AddExpenseContainer() {
  const navigate = useNavigate()
  const detailed = useTweaks().density === 'detailed'

  const [mode, setMode] = useState<Mode>('manual')
  const [recording, setRecording] = useState(false)
  const [parsed, setParsed] = useState<ParsedVoiceExpense | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Synchronous guard against a double-submit racing the isPending re-render —
  // logging a gasto twice would deduct the account balance twice.
  const inFlight = useRef(false)

  const { data: accounts = [] } = useQuery(accountsQuery())
  const createExpense = useCreateExpense()
  const parseVoice = useParseVoice()

  const goHome = () => navigate({ to: '/', replace: true })

  const save = (input: CreateExpenseInput) => {
    if (inFlight.current) return
    inFlight.current = true
    createExpense.mutate(input, {
      onSuccess: goHome,
      onError: (err) => {
        inFlight.current = false
        setError(err instanceof Error ? err.message : 'No pudimos guardar el gasto')
      },
    })
  }

  const handleManualSubmit = (fields: ExpenseFormFields) => {
    setError(null)
    const amountCents = parseAmountToCents(fields.amount)
    if (amountCents === null) {
      setError('El monto no es válido')
      return
    }
    save({
      amountCents,
      category: fields.category,
      description: fields.description,
      accountId: fields.accountId,
    })
  }

  const handleVoiceSave = () => {
    if (!parsed) return
    setError(null)
    save({
      amountCents: parsed.amountCents,
      category: parsed.category,
      description: parsed.description,
    })
  }

  const handleRelease = () => {
    if (!recording) return
    setRecording(false)
    const transcript = STUB_TRANSCRIPTS[Math.floor(Math.random() * STUB_TRANSCRIPTS.length)]
    parseVoice.mutate(transcript, {
      onSuccess: setParsed,
      onError: (err) => setError(err instanceof Error ? err.message : 'No te entendí'),
    })
  }

  return (
    <PhoneShell>
      <AppBar
        title="Registrar"
        left={
          <button type="button" onClick={goHome} className="wf-tap text-[16px] text-ink">
            ✕
          </button>
        }
      />

      {mode === 'manual' ? (
        <ExpenseForm
          accounts={accounts.map((a) => ({ id: a.id, name: a.name }))}
          submitting={createExpense.isPending}
          error={error}
          onSubmit={handleManualSubmit}
          onUseVoice={() => {
            setError(null)
            setMode('voice')
          }}
        />
      ) : (
        <VoiceCapture
          recording={recording}
          pending={parseVoice.isPending}
          parsed={parsed}
          error={error}
          detailed={detailed}
          saving={createExpense.isPending}
          onPress={() => {
            setError(null)
            setRecording(true)
          }}
          onRelease={handleRelease}
          onRetry={() => setParsed(null)}
          onSave={handleVoiceSave}
          onUseManual={() => {
            setError(null)
            setParsed(null)
            setRecording(false)
            setMode('manual')
          }}
        />
      )}
    </PhoneShell>
  )
}
