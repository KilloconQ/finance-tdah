import { createFileRoute } from '@tanstack/react-router'
import { AccountsContainer, accountsQueryOptions } from '@/features/accounts'
import { goalsQueryOptions } from '@/features/goals'
import { queryClient } from '@/lib/query-client'

export const Route = createFileRoute('/_app/accounts/')({
  loader: () => {
    void queryClient.prefetchQuery(accountsQueryOptions())
    void queryClient.prefetchQuery(goalsQueryOptions())
  },
  component: AccountsContainer,
})
