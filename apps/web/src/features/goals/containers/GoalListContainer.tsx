import { useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useTweaks } from '@/lib/use-tweaks'
import { goalsQueryOptions } from '../api'
import { GoalListView } from '../components/GoalListView'

export function GoalListContainer() {
  const navigate = useNavigate()
  const { showBalances, density } = useTweaks()
  const { data: goals = [] } = useQuery(goalsQueryOptions())
  const totalCents = goals.reduce((sum, g) => sum + g.currentCents, 0)

  return (
    <GoalListView
      goals={goals}
      totalCents={totalCents}
      showBalances={showBalances}
      detailed={density === 'detailed'}
      onAddNew={() => navigate({ to: '/goals/new' })}
      onSelectGoal={(id) => navigate({ to: '/goals/$id', params: { id } })}
    />
  )
}
