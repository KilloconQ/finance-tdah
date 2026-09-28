import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { CreateEnvelopeInput, UpdateEnvelopeInput } from '@finance-tdah/shared/schemas'
import { api } from '@/lib/api'
import { envelopesQueryOptions } from './envelopes.queries'

// Envelope moves only earmark money inside an account, so account balances
// and the dashboard don't change — only the envelopes list does.
function useEnvelopeMutation<T>(mutationFn: (input: T) => Promise<unknown>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: envelopesQueryOptions().queryKey })
    },
  })
}

export function useCreateEnvelope() {
  return useEnvelopeMutation((input: CreateEnvelopeInput) => api.post('envelopes', { json: input }).json())
}

export function useAdjustEnvelope() {
  return useEnvelopeMutation(({ id, deltaCents }: { id: string; deltaCents: number }) =>
    api.post(`envelopes/${id}/adjust`, { json: { deltaCents } }).json(),
  )
}

export function useUpdateEnvelope() {
  return useEnvelopeMutation(({ id, ...input }: UpdateEnvelopeInput & { id: string }) =>
    api.patch(`envelopes/${id}`, { json: input }).json(),
  )
}

export function useDeleteEnvelope() {
  return useEnvelopeMutation((id: string) => api.delete(`envelopes/${id}`).json())
}
