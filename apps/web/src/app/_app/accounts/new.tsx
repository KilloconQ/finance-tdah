import { createFileRoute } from '@tanstack/react-router'
import { NewAccountContainer } from '@/features/accounts'

export const Route = createFileRoute('/_app/accounts/new')({
  component: NewAccountContainer,
})
