import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { CreateFinancialAccountInput, UpdateFinancialAccountInput } from '@finance-tdah/shared/schemas'
import { api } from '@/lib/api'

export function useCreateAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateFinancialAccountInput) => api.post('accounts', { json: input }).json(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['accounts'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useUpdateAccount(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateFinancialAccountInput) => api.patch(`accounts/${id}`, { json: input }).json(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['accounts'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}
