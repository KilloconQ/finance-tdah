import { useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { centsToUnits, parseAmountToCents } from '@finance-tdah/shared/domain'
import { AppBar, EmptyState, IconButton, PhoneShell } from '@/components'
import { accountsQuery } from '@/lib/queries'
import { expenseQueryOptions, useUpdateExpense } from '../api'
import { ExpenseForm, type ExpenseFormFields } from '../components/ExpenseForm'

interface EditExpenseContainerProps {
  expenseId: string
}

export function EditExpenseContainer({ expenseId }: EditExpenseContainerProps) {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const inFlight = useRef(false)

  const { data: expense } = useQuery(expenseQueryOptions(expenseId))
  const { data: accounts = [] } = useQuery(accountsQuery())
  const updateExpense = useUpdateExpense(expenseId)

  const goBack = () => navigate({ to: '/transactions' })

  if (!expense) {
    return (
      <PhoneShell variant="narrow">
        <AppBar title="Editar gasto" back onBack={goBack} />
        <EmptyState
          className="flex-1"
          title="No encontramos ese movimiento"
          hint="Puede que lo hayas borrado o que el enlace esté roto."
        />
      </PhoneShell>
    )
  }

  const handleSubmit = (fields: ExpenseFormFields) => {
    setError(null)

    const amountCents = parseAmountToCents(fields.amount)
    if (amountCents === null || amountCents <= 0) {
      setError('El monto debe ser mayor a $0')
      return
    }

    if (inFlight.current) return
    inFlight.current = true
    updateExpense.mutate(
      {
        amountCents,
        category: fields.category,
        description: fields.description,
        accountId: fields.accountId,
        kind: fields.kind,
        toAccountId: fields.toAccountId,
      },
      {
        onSuccess: () => navigate({ to: '/transactions', replace: true }),
        onError: (err) => {
          inFlight.current = false
          setError(err instanceof Error ? err.message : 'No pudimos actualizar el gasto')
        },
      },
    )
  }

  return (
    <PhoneShell variant="narrow">
      <AppBar
        title="Editar gasto"
        left={
          <IconButton onClick={goBack} label="Cerrar">
            <X size={20} strokeWidth={2} />
          </IconButton>
        }
      />
      <ExpenseForm
        accounts={accounts.map((a) => ({ id: a.id, name: a.name, type: a.type }))}
        submitting={updateExpense.isPending}
        error={error}
        onSubmit={handleSubmit}
        initial={{
          amount: String(centsToUnits(expense.amountCents)),
          category: expense.category,
          description: expense.description,
          accountId: expense.accountId ?? undefined,
          kind: expense.kind,
          toAccountId: expense.toAccountId ?? undefined,
        }}
        submitLabel="Guardar cambios"
      />
    </PhoneShell>
  )
}
