import { createFileRoute } from '@tanstack/react-router'
import { GoalListContainer, goalsQueryOptions } from '@/features/goals'
import { queryClient } from '@/lib/query-client'

export const Route = createFileRoute('/_app/goals/')({
  loader: () => queryClient.ensureQueryData(goalsQueryOptions()),
  component: GoalListContainer,
})
