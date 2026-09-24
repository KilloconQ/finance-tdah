import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { CreateSubscriptionInput, UpdateSubscriptionInput } from '@finance-tdah/shared/schemas'
import { api } from '@/lib/api'
import { subscriptionsQueryOptions } from './subscriptions.queries'

export function useCreateSubscription() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateSubscriptionInput) =>
      api.post('subscriptions', { json: input }).json(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: subscriptionsQueryOptions().queryKey })
    },
  })
}

export function useUpdateSubscription(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateSubscriptionInput) =>
      api.patch(`subscriptions/${id}`, { json: input }).json(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: subscriptionsQueryOptions().queryKey })
    },
  })
}

export function useCancelSubscription(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api.post(`subscriptions/${id}/cancel`).json(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: subscriptionsQueryOptions().queryKey })
    },
  })
}

export function usePauseSubscription(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api.post(`subscriptions/${id}/pause`).json(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: subscriptionsQueryOptions().queryKey })
    },
  })
}
