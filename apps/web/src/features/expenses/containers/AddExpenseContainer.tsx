import { useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import type { CreateExpenseInput, ParsedVoiceExpense } from '@finance-tdah/shared/schemas'
import { parseAmountToCents } from '@finance-tdah/shared/domain'
import { X } from 'lucide-react'
import { AppBar, IconButton, PhoneShell } from '@/components'
import { envelopesQueryOptions } from '@/features/envelopes'
import { accountsQuery } from '@/lib/queries'
import { useTweaks } from '@/lib/use-tweaks'
import { useCreateExpense, useParseVoice } from '../api'
import { ExpenseForm, type ExpenseFormFields } from '../components/ExpenseForm'
import { VoiceCapture } from '../components/VoiceCapture'

type Mode = 'voice' | 'manual'

function getSpeechRecognitionCtor(): (new () => SpeechRecognition) | undefined {
  return window.SpeechRecognition ?? window.webkitSpeechRecognition
}

function speechErrorMessage(code: string, trace: string): string {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'Necesito permiso para usar el micrófono'
    case 'no-speech':
      return 'No escuché nada, prueba de nuevo'
    case 'network':
      return 'Sin conexión para reconocer voz'
    default:
      // Include the browser's code so a failing device can be diagnosed.
      return `No te entendí (${code} ${trace}), prueba de nuevo`
  }
}

export function AddExpenseContainer() {
  const navigate = useNavigate()
  const { inputPreference } = useTweaks()

  const [mode, setMode] = useState<Mode>(() => (inputPreference === 'manual' ? 'manual' : 'voice'))
  const [recording, setRecording] = useState(false)
  const [parsed, setParsed] = useState<ParsedVoiceExpense | null>(null)
  const [error, setError] = useState<string | null>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  // Timeline of speech/press events, shown with unexpected errors to diagnose devices.
  const trace = useRef<{ t0: number; events: string[] }>({ t0: 0, events: [] })
  const mark = (name: string) =>
    trace.current.events.push(`${name}@${Math.round(performance.now() - trace.current.t0)}`)

  // Synchronous guard against a double-submit racing the isPending re-render —
  // logging a gasto twice would deduct the account balance twice.
  const inFlight = useRef(false)

  const { data: accounts = [] } = useQuery(accountsQuery())
  const { data: envelopes = [] } = useQuery(envelopesQueryOptions())
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
      kind: fields.kind,
      toAccountId: fields.toAccountId,
      envelopeId: fields.envelopeId,
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

  const startRecording = () => {
    setError(null)
    const Ctor = getSpeechRecognitionCtor()
    if (!Ctor) {
      setError('Tu navegador no soporta reconocimiento de voz')
      return
    }

    trace.current = { t0: performance.now(), events: [] }
    const recognition = new Ctor()
    recognition.onstart = () => mark('start')
    recognition.onaudiostart = () => mark('audio')
    recognition.onspeechstart = () => mark('speech')
    recognition.lang = navigator.language.toLowerCase().startsWith('es') ? navigator.language : 'es-ES'
    recognition.continuous = false
    recognition.interimResults = false
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript
      if (!transcript) {
        setError('No te entendí, prueba de nuevo')
        return
      }
      parseVoice.mutate(transcript, {
        onSuccess: setParsed,
        onError: (err) => setError(err instanceof Error ? err.message : 'No te entendí'),
      })
    }
    recognition.onerror = (event) => {
      setRecording(false)
      setError(speechErrorMessage(event.error, trace.current.events.join(',')))
    }
    recognition.onend = () => setRecording(false)

    recognitionRef.current = recognition
    try {
      recognition.start()
      setRecording(true)
    } catch {
      // start() throws synchronously if a recognizer is already active for this tab
      setError('No pude activar el micrófono, prueba de nuevo')
    }
  }

  const handleRelease = () => {
    if (!recording) return
    mark('release')
    recognitionRef.current?.stop()
  }

  return (
    <PhoneShell variant="narrow">
      <AppBar
        title="Registrar"
        left={
          <IconButton onClick={goHome} label="Cerrar">
            <X size={20} strokeWidth={2} />
          </IconButton>
        }
      />

      {mode === 'manual' ? (
        <ExpenseForm
          accounts={accounts.map((a) => ({ id: a.id, name: a.name, type: a.type }))}
          envelopes={envelopes}
          submitting={createExpense.isPending}
          error={error}
          onSubmit={handleManualSubmit}
          onUseVoice={() => {
            if (!getSpeechRecognitionCtor()) {
              setError('Tu navegador no soporta reconocimiento de voz')
              return
            }
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
          saving={createExpense.isPending}
          onPress={startRecording}
          onRelease={handleRelease}
          onRetry={() => setParsed(null)}
          onSave={handleVoiceSave}
          onUseManual={() => {
            recognitionRef.current?.stop()
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
