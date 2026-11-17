import type { z } from 'zod'
import type { cardStatementSchema } from '@finance-tdah/shared/schemas'
import { Money } from '@/components'
import { formatDateOnly } from '@/lib/format'

type CardStatement = z.infer<typeof cardStatementSchema>

interface CardStatementSummaryProps {
  statement: CardStatement
}

/** What the card asks for on its payment date, and what already rolls into the next statement. */
// `today` comes from the API, in the profile's time zone, so a traveller's device clock does not
// change whether the payment date has passed.
export function CardStatementSummary({ statement }: CardStatementSummaryProps) {
  const { dueCents, paymentDate, openPeriodCents, nextCutoffDate, today } = statement
  const overdue = dueCents > 0 && paymentDate < today

  return (
    <section aria-label="Estado de cuenta" className="rounded-2xl border border-line bg-surface p-4">
      <p className="text-sm text-ink-mid">
        {dueCents === 0
          ? 'No tienes nada pendiente de este corte'
          : overdue
            ? `Debiste pagar el ${formatDateOnly(paymentDate)}`
            : `Te toca pagar el ${formatDateOnly(paymentDate)}`}
      </p>
      {dueCents > 0 ? <Money value={dueCents / 100} className="mt-1 block text-3xl" weight="semibold" /> : null}
      <p className="mt-3 text-xs text-ink-soft">
        Lo que gastes desde el corte (<Money value={openPeriodCents / 100} className="text-xs" />) se paga en el siguiente
        periodo, que cierra el {formatDateOnly(nextCutoffDate)}.
      </p>
    </section>
  )
}
