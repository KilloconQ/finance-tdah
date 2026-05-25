import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { CreateExpenseInput, ParsedVoiceExpense } from '@finance-tdah/shared/schemas'
import { api } from '@/lib/api'

export function useCreateExpense() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateExpenseInput) => api.post('expenses', { json: input }).json(),
    onSuccess: () => {
      // Logging an expense moves money, so refresh every view that shows it.
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
