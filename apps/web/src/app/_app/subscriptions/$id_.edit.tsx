import { createFileRoute } from '@tanstack/react-router'
import { EditSubscriptionContainer, subscriptionQueryOptions } from '@/features/subscriptions'
import { queryClient } from '@/lib/query-client'

export const Route = createFileRoute('/_app/subscriptions/$id_/edit')({
  loader: ({ params }) => queryClient.ensureQueryData(subscriptionQueryOptions(params.id)),
  component: SubscriptionEditRoute,
})

function SubscriptionEditRoute() {
  const { id } = Route.useParams()
  return <EditSubscriptionContainer subscriptionId={id} />
}
