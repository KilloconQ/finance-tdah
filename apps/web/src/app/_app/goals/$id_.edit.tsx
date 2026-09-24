import { createFileRoute } from '@tanstack/react-router'
import { EditGoalContainer, goalQueryOptions } from '@/features/goals'
import { queryClient } from '@/lib/query-client'

export const Route = createFileRoute('/_app/goals/$id_/edit')({
  loader: ({ params }) => queryClient.ensureQueryData(goalQueryOptions(params.id)),
  component: GoalEditRoute,
})

function GoalEditRoute() {
  const { id } = Route.useParams()
  return <EditGoalContainer goalId={id} />
}
