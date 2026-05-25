import { z } from 'zod'
import { queryOptions } from '@tanstack/react-query'
import { financialAccountSchema } from '@finance-tdah/shared/schemas'
import { fetchValidated } from '@/lib/api'

export const accountsQueryOptions = () =>
  queryOptions({
    queryKey: ['accounts'],
    queryFn: () =>
      fetchValidated('/accounts', z.object({ accounts: z.array(financialAccountSchema) })).then(
        (r) => r.accounts,
      ),
  })
