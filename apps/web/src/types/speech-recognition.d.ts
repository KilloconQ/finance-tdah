// Web Speech API isn't part of TypeScript's bundled DOM lib (not a W3C
// standard, still webkit-prefixed in Safari) — minimal surface for what
// AddExpenseContainer actually uses.
interface SpeechRecognitionErrorEvent extends Event {
  error: string
}

interface SpeechRecognitionResultAlternative {
  transcript: string
}

interface SpeechRecognitionResult {
  0: SpeechRecognitionResultAlternative
}

interface SpeechRecognitionEvent extends Event {
  results: ArrayLike<SpeechRecognitionResult>
}

interface SpeechRecognition extends EventTarget {
  lang: string
  continuous: boolean
  interimResults: boolean
  start(): void
  stop(): void
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
}

interface Window {
  SpeechRecognition?: new () => SpeechRecognition
  webkitSpeechRecognition?: new () => SpeechRecognition
}
