import { useState } from 'react'
import type { IncomeDTO } from '@finance-tdah/shared/schemas'
import { Sheet } from '@/components'
import { errorText } from '@/lib/api'
import { useCreateIncome, useDeleteIncome, useUpdateIncome } from '../api'
import { IncomeForm, type IncomeFormValues } from '../components/IncomeForm'

/** Creates an income, or edits / deletes `income`. */
export function IncomeSheet({ income, onClose }: { income: IncomeDTO | null; onClose: () => void }) {
  const [error, setError] = useState<string | null>(null)
  const create = useCreateIncome()
  const update = useUpdateIncome(income?.id ?? '')
  const remove = useDeleteIncome(income?.id ?? '')
  const busy = create.isPending || update.isPending || remove.isPending

  const options = {
    onSuccess: onClose,
    onError: (err: unknown) => setError(errorText(err, 'No pudimos guardar el ingreso')),
  }

  const submit = (values: IncomeFormValues) => {
    setError(null)
    if (income) update.mutate(values, options)
    else create.mutate(values, options)
  }

  return (
    <Sheet title={income ? 'Editar ingreso' : 'Nuevo ingreso'} onClose={onClose} busy={busy}>
      <IncomeForm
        initial={income ? { name: income.name, amountCents: income.amountCents, frequency: income.frequency, startsOn: income.startsOn } : undefined}
        submitting={busy}
        error={error}
        submitLabel={income ? 'Guardar' : 'Agregar ingreso'}
        onSubmit={submit}
        onDelete={income ? () => remove.mutate(undefined, options) : undefined}
      />
    </Sheet>
  )
}
