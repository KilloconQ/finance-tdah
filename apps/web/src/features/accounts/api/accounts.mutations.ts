import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { CreateFinancialAccountInput } from '@finance-tdah/shared/schemas'
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
