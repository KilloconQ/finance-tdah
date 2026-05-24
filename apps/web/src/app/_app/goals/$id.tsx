import { createFileRoute } from '@tanstack/react-router'
import { GoalDetailContainer, goalQueryOptions } from '@/features/goals'
import { queryClient } from '@/lib/query-client'

export const Route = createFileRoute('/_app/goals/$id')({
  loader: ({ params }) => queryClient.ensureQueryData(goalQueryOptions(params.id)),
  component: GoalDetailRoute,
})

function GoalDetailRoute() {
  const { id } = Route.useParams()
  return <GoalDetailContainer goalId={id} />
}
