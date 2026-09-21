import { createFileRoute } from '@tanstack/react-router'
import { EditAccountContainer } from '@/features/accounts'

export const Route = createFileRoute('/_app/accounts/$id')({
  component: AccountEditRoute,
})

function AccountEditRoute() {
  const { id } = Route.useParams()
  return <EditAccountContainer accountId={id} />
}
