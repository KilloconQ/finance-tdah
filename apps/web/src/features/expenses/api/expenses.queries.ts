import { z } from 'zod'
import { queryOptions } from '@tanstack/react-query'
import { expenseSchema } from '@finance-tdah/shared/schemas'
import { fetchValidated } from '@/lib/api'

export const expensesQueryOptions = () =>
  queryOptions({
    queryKey: ['expenses'],
    queryFn: () =>
      fetchValidated('/expenses', z.object({ expenses: z.array(expenseSchema) })).then(
        (r) => r.expenses,
      ),
  })

// The API has no GET /expenses/:id — a single expense is derived from the
// list query via `select`, sharing its queryKey/cache entry so mutations
// only need to invalidate one key (same pattern as subscriptions).
export const expenseQueryOptions = (id: string) =>
  queryOptions({
    ...expensesQueryOptions(),
    select: (expenses) => expenses.find((e) => e.id === id),
  })
