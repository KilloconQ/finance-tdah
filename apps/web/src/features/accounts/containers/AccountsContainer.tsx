import { useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { netWorth } from '@finance-tdah/shared/domain'
import { goalsQueryOptions } from '@/features/goals'
import { useTweaks } from '@/lib/use-tweaks'
import { accountsQueryOptions } from '../api'
import { AccountsView } from '../components/AccountsView'

export function AccountsContainer() {
  const navigate = useNavigate()
  const { showBalances, density } = useTweaks()

  const { data: accounts = [] } = useQuery(accountsQueryOptions())
  const { data: goals = [] } = useQuery(goalsQueryOptions())

  // Jars live inside accounts, so net worth is liquid - debt and jar totals are
  // a separate view. See packages/shared/src/domain/net-worth.ts.
  const { liquidCents, debtCents, netWorthCents } = netWorth(accounts)
  const goalsTotalCents = goals.reduce((sum, g) => sum + g.currentCents, 0)

  return (
    <AccountsView
      accounts={accounts}
      goalsTotalCents={goalsTotalCents}
      liquidCents={liquidCents}
      debtCents={debtCents}
      netWorthCents={netWorthCents}
      showBalances={showBalances}
      detailed={density === 'detailed'}
      onBack={() => navigate({ to: '/' })}
      onAddAccount={() => navigate({ to: '/accounts/new' })}
    />
  )
}
