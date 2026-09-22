import { createFileRoute } from '@tanstack/react-router'
import { NewSubscriptionContainer } from '@/features/subscriptions'

export const Route = createFileRoute('/_app/subscriptions/new')({
  component: NewSubscriptionContainer,
})
