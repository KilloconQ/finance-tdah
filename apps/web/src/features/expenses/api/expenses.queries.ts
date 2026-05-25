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
