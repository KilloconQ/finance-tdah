import { createFileRoute } from '@tanstack/react-router'
import { GroupDetail, groupQueryOptions } from '@/features/groups'
import { queryClient } from '@/lib/query-client'

export const Route = createFileRoute('/_app/groups/$id')({
  loader: ({ params }) => queryClient.ensureQueryData(groupQueryOptions(params.id)),
  component: GroupRoute,
})

function GroupRoute() {
  const { id } = Route.useParams()
  return <GroupDetail groupId={id} />
}
