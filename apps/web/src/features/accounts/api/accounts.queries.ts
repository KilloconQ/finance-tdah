import { z } from 'zod'
import { queryOptions } from '@tanstack/react-query'
import { cardStatementSchema, financialAccountSchema } from '@finance-tdah/shared/schemas'
import { fetchValidated } from '@/lib/api'

export const accountsQueryOptions = () =>
  queryOptions({
    queryKey: ['accounts'],
    queryFn: () =>
      fetchValidated('/accounts', z.object({ accounts: z.array(financialAccountSchema) })).then(
        (r) => r.accounts,
      ),
  })

export const accountStatementQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ['accounts', id, 'statement'],
    queryFn: () =>
      fetchValidated(`/accounts/${id}/statement`, z.object({ statement: cardStatementSchema })).then(
        (r) => r.statement,
      ),
  })
