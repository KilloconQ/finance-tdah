import type { ParsedVoiceExpense } from '@finance-tdah/shared/schemas'

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  café: ['café', 'cafe', 'starbucks', 'latte', 'capuchino', 'cielito'],
  comida: ['comida', 'súper', 'super', 'mercado', 'cena', 'restaurant', 'desayuno', 'almuerzo'],
  transporte: ['uber', 'taxi', 'didi', 'metro', 'transporte', 'gasolina'],
  ocio: ['cine', 'bar', 'cerveza', 'salida', 'fiesta'],
  subs: ['netflix', 'spotify', 'apple', 'suscripción', 'subscripcion'],
  hogar: ['luz', 'gas', 'agua', 'internet', 'renta', 'casa'],
}

export function parseVoiceTranscript(text: string): ParsedVoiceExpense | null {
  const lower = text.toLowerCase().trim()
  if (!lower) return null

  const amountMatch = lower.match(/(\d+(?:[.,]\d{1,2})?)/)
  if (!amountMatch) return null

  const amount = Number.parseFloat(amountMatch[1].replace(',', '.'))
  if (!Number.isFinite(amount) || amount <= 0) return null

  let category = 'otros'
  let confidence = 0.5

  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      category = cat
      confidence = 0.9
      break
    }
  }

  const description = text.length > 120 ? text.slice(0, 117) + '…' : text

  return {
    amountCents: Math.round(amount * 100),
    category,
    description,
    confidence,
  }
}
