import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  groupDetailSchema,
  groupListSchema,
  type CreateSharedExpenseInput,
} from '@finance-tdah/shared/schemas'
import { api, fetchValidated } from '@/lib/api'

export const groupsQueryOptions = () =>
  queryOptions({
    queryKey: ['groups'],
    queryFn: () => fetchValidated('/groups', groupListSchema).then((r) => r.groups),
  })

export const groupQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ['groups', id],
    queryFn: () => fetchValidated(`/groups/${id}`, groupDetailSchema),
  })

export function useCreateGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => api.post('groups', { json: { name } }).json(),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['groups'] }),
  })
}

/** Every write inside a group refreshes the group (members, expenses, balances). */
function useGroupWrite<T>(send: (input: T) => Promise<unknown>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: send,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['groups'] }),
  })
}

export const useAddMember = (groupId: string) =>
  useGroupWrite((email: string) => api.post(`groups/${groupId}/members`, { json: { email } }).json())

export const useAddSharedExpense = (groupId: string) =>
  useGroupWrite((input: CreateSharedExpenseInput) =>
    api.post(`groups/${groupId}/expenses`, { json: input }).json(),
  )

export const useUpdateSharedExpense = (groupId: string) =>
  useGroupWrite(({ expenseId, input }: { expenseId: string; input: CreateSharedExpenseInput }) =>
    api.put(`groups/${groupId}/expenses/${expenseId}`, { json: input }).json(),
  )

export const useDeleteSharedExpense = (groupId: string) =>
  useGroupWrite((expenseId: string) => api.delete(`groups/${groupId}/expenses/${expenseId}`).json())

export const useSettle = (groupId: string) =>
  useGroupWrite((input: { fromUserId: string; toUserId: string; amountCents: number; date: string }) =>
    api.post(`groups/${groupId}/settlements`, { json: input }).json(),
  )
