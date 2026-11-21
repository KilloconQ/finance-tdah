import { createFileRoute } from '@tanstack/react-router'
import { CalendarContainer } from '@/features/calendar'

export const Route = createFileRoute('/_app/calendar')({
  component: CalendarContainer,
})
