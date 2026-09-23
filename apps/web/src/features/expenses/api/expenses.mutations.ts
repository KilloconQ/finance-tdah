import { useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  CreateExpenseInput,
  ParsedVoiceExpense,
  UpdateExpenseInput,
} from '@finance-tdah/shared/schemas'
import { api } from '@/lib/api'
import { expensesQueryOptions } from './expenses.queries'

export function useCreateExpense() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateExpenseInput) => api.post('expenses', { json: input }).json(),
    onSuccess: () => {
      // Logging an expense moves money, so refresh every view that shows it.
      void queryClient.invalidateQueries({ queryKey: expensesQueryOptions().queryKey })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      void queryClient.invalidateQueries({ queryKey: ['accounts'] })
    },
  })
}

export function useUpdateExpense(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateExpenseInput) => api.patch(`expenses/${id}`, { json: input }).json(),
    onSuccess: () => {
      // An edit can change amount/kind/account, all of which move balances,
      // so refresh the same set of views a create/delete would.
      void queryClient.invalidateQueries({ queryKey: expensesQueryOptions().queryKey })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      void queryClient.invalidateQueries({ queryKey: ['accounts'] })
    },
  })
}

export function useDeleteExpense() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`expenses/${id}`).json(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['expenses'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      void queryClient.invalidateQueries({ queryKey: ['accounts'] })
    },
  })
}

export function useParseVoice() {
  return useMutation({
    mutationFn: async (transcript: string) => {
      const result = await api
        .post('expenses/voice', { json: { transcript } })
        .json<{ parsed: ParsedVoiceExpense }>()
      return result.parsed
    },
  })
}
