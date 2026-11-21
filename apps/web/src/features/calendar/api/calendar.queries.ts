import { z } from 'zod'
import { queryOptions } from '@tanstack/react-query'
import { calendarResponseSchema, incomeSchema } from '@finance-tdah/shared/schemas'
import { fetchValidated } from '@/lib/api'

// Always refetch on mount: subscriptions and accounts change what the calendar shows and don't know about this key.
export const calendarQueryOptions = (from: string, to: string) =>
  queryOptions({
    queryKey: ['calendar', from, to],
    queryFn: () => fetchValidated(`/calendar?from=${from}&to=${to}`, calendarResponseSchema),
    staleTime: 0,
  })

export const incomesQueryOptions = () =>
  queryOptions({
    queryKey: ['incomes'],
    queryFn: () => fetchValidated('/incomes', z.object({ incomes: z.array(incomeSchema) })).then((r) => r.incomes),
  })
