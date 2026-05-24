import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { CreateGoalInput } from '@finance-tdah/shared/schemas'
import { api } from '@/lib/api'

export function useCreateGoal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateGoalInput) => api.post('goals', { json: input }).json(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['goals'] })
    },
  })
}

export function useAddToGoal(goalId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (amountCents: number) =>
      api.post(`goals/${goalId}/add`, { json: { amountCents } }).json(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['goals'] })
      void queryClient.invalidateQueries({ queryKey: ['goals', goalId] })
    },
  })
}
