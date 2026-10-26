import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import {
  groupDetailSchema,
  groupInvitationListSchema,
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

export const invitationsQueryOptions = () =>
  queryOptions({
    queryKey: ['invitations'],
    queryFn: () => fetchValidated('/invitations', groupInvitationListSchema).then((r) => r.invitations),
  })

type GroupInvitation = z.infer<typeof groupInvitationListSchema>['invitations'][number]

/**
 * Accepting drops the card from the cache right away. The mutation stays pending until the groups
 * refetch lands, so the screen can hold off its "no groups" state while the new group loads.
 * Settled, not just successful: a failed answer usually means the invitation is gone, so the list
 * is refetched either way (which also puts back a card that could still be answered).
 */
export function useAnswerInvitation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, answer }: { id: string; answer: 'accept' | 'decline' }) =>
      api.post(`invitations/${id}/${answer}`).json(),
    onMutate: async ({ id, answer }) => {
      if (answer !== 'accept') return
      await queryClient.cancelQueries({ queryKey: ['invitations'] })
      queryClient.setQueryData<GroupInvitation[]>(['invitations'], (list) => list?.filter((inv) => inv.id !== id))
    },
    onSettled: async (_data, _err, { answer }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['invitations'] }),
        answer === 'accept' ? queryClient.invalidateQueries({ queryKey: ['groups'] }) : null,
      ])
    },
  })
}

/** Emails a sign-up link to someone not on Cada Quien yet. */
export const useInviteToApp = () =>
  useMutation({
    mutationFn: (email: string) =>
      fetchValidated('/invitations/app', z.object({ ok: z.literal(true) }), { method: 'POST', json: { email } }),
  })

/** Every write inside a group refreshes the group (members, expenses, balances). */
function useGroupWrite<T>(send: (input: T) => Promise<unknown>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: send,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['groups'] }),
  })
}

export const useInviteToGroup = (groupId: string) =>
  useGroupWrite((email: string) => api.post(`groups/${groupId}/invitations`, { json: { email } }).json())

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

export const useLeaveGroup = (groupId: string) =>
  useGroupWrite(() => api.delete(`groups/${groupId}/members/me`).json())
