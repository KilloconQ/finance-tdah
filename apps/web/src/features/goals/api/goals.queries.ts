import { z } from 'zod'
import { queryOptions } from '@tanstack/react-query'
import { goalSchema } from '@finance-tdah/shared/schemas'
import { fetchValidated } from '@/lib/api'

export const goalsQueryOptions = () =>
  queryOptions({
    queryKey: ['goals'],
    queryFn: () =>
      fetchValidated('/goals', z.object({ goals: z.array(goalSchema) })).then((r) => r.goals),
  })

export const goalQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ['goals', id],
    queryFn: () =>
      fetchValidated(`/goals/${id}`, z.object({ goal: goalSchema })).then((r) => r.goal),
  })
