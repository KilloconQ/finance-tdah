import { createFileRoute } from '@tanstack/react-router'
import { EditExpenseContainer, expenseQueryOptions } from '@/features/expenses'
import { queryClient } from '@/lib/query-client'

export const Route = createFileRoute('/_app/transactions_/$id_/edit')({
  loader: ({ params }) => queryClient.ensureQueryData(expenseQueryOptions(params.id)),
  component: ExpenseEditRoute,
})

function ExpenseEditRoute() {
  const { id } = Route.useParams()
  return <EditExpenseContainer expenseId={id} />
}
