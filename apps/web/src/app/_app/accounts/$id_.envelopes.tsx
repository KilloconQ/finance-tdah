import { createFileRoute } from '@tanstack/react-router'
import { EnvelopesContainer } from '@/features/envelopes'

export const Route = createFileRoute('/_app/accounts/$id_/envelopes')({
  component: AccountEnvelopesRoute,
})

function AccountEnvelopesRoute() {
  const { id } = Route.useParams()
  return <EnvelopesContainer accountId={id} />
}
