import { useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useTweaks } from '@/lib/use-tweaks'
import { goalsQueryOptions } from '../api'
import { GoalListView } from '../components/GoalListView'

export function GoalListContainer() {
  const navigate = useNavigate()
  const { showBalances } = useTweaks()
  const { data: goals = [], isLoading } = useQuery(goalsQueryOptions())
  const totalCents = goals.reduce((sum, g) => sum + g.currentCents, 0)

  return (
    <GoalListView
      goals={goals}
      totalCents={totalCents}
      showBalances={showBalances}
      isLoading={isLoading}
      onAddNew={() => navigate({ to: '/goals/new' })}
      onSelectGoal={(id) => navigate({ to: '/goals/$id', params: { id } })}
    />
  )
}
