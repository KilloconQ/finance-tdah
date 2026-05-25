import { createFileRoute } from '@tanstack/react-router'
import { AddExpenseContainer } from '@/features/expenses'

export const Route = createFileRoute('/_app/add-expense')({
  component: AddExpenseContainer,
})
