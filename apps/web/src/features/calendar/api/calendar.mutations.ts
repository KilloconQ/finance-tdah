import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { CreateIncomeInput, UpdateIncomeInput } from '@finance-tdah/shared/schemas'
import { api } from '@/lib/api'

function useRefresh() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['incomes'] })
    void queryClient.invalidateQueries({ queryKey: ['calendar'] })
  }
}

export function useCreateIncome() {
  const refresh = useRefresh()
  return useMutation({ mutationFn: (input: CreateIncomeInput) => api.post('incomes', { json: input }).json(), onSuccess: refresh })
}

export function useUpdateIncome(id: string) {
  const refresh = useRefresh()
  return useMutation({ mutationFn: (input: UpdateIncomeInput) => api.patch(`incomes/${id}`, { json: input }).json(), onSuccess: refresh })
}

export function useDeleteIncome(id: string) {
  const refresh = useRefresh()
  return useMutation({ mutationFn: () => api.delete(`incomes/${id}`).json(), onSuccess: refresh })
}
