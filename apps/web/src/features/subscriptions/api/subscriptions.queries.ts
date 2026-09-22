import { z } from 'zod'
import { queryOptions } from '@tanstack/react-query'
import { subscriptionSchema } from '@finance-tdah/shared/schemas'
import { fetchValidated } from '@/lib/api'

export const subscriptionsQueryOptions = () =>
  queryOptions({
    queryKey: ['subscriptions'],
    queryFn: () =>
      fetchValidated(
        '/subscriptions',
        z.object({ subscriptions: z.array(subscriptionSchema) }),
      ).then((r) => r.subscriptions),
  })

// The API has no GET /subscriptions/:id — a single subscription is derived from
// the list query via `select`, sharing its queryKey/cache entry so mutations
// only need to invalidate one key.
export const subscriptionQueryOptions = (id: string) =>
  queryOptions({
    ...subscriptionsQueryOptions(),
    select: (subs) => subs.find((s) => s.id === id),
  })
