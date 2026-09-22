import { createFileRoute } from '@tanstack/react-router'
import { NewGoalContainer } from '@/features/goals'

export const Route = createFileRoute('/_app/goals/new')({
  component: NewGoalContainer,
})
