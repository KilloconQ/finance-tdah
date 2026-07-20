import type { FinancialAccountDTO } from '@finance-tdah/shared/schemas'
import { Plus, Wallet } from 'lucide-react'
import {
  AppBar,
  BigNumber,
  Btn,
  Card,
  EmptyState,
  IconButton,
  Money,
  PhoneShell,
  SectionHeader,
  Skeleton,
  TabBar,
} from '@/components'

const ACCOUNT_EMOJI: Record<string, string> = {
  debito: '🏦',
  credito: '💳',
  efectivo: '💵',
  wallet: '📱',
  ahorro: '🐷',
}

const ACCOUNT_LABEL: Record<string, string> = {
  debito: 'Débito',
  credito: 'Crédito',
  efectivo: 'Efectivo',
  wallet: 'Wallet',
  ahorro: 'Ahorro',
}

interface AccountsViewProps {
  accounts: FinancialAccountDTO[]
  goalsTotalCents: number
  liquidCents: number
  debtCents: number
  netWorthCents: number
  showBalances: boolean
  loading: boolean
  onAddAccount: () => void
}

export function AccountsView({
  accounts,
  goalsTotalCents,
  liquidCents,
  debtCents,
  netWorthCents,
  showBalances,
  loading,
  onAddAccount,
}: AccountsViewProps) {
  // The bar splits total assets into the free slice and the jar-earmarked slice
  // (both already part of liquid), then debt — so nothing is counted twice.
  const freeWeight = Math.max(0, liquidCents - goalsTotalCents)
  const totalWeight = Math.max(1, freeWeight + goalsTotalCents + debtCents)

  return (
    <PhoneShell>
      <AppBar
        title="Cuánto tienes"
        right={
          <IconButton onClick={onAddAccount} label="Agregar cuenta">
            <Plus size={20} strokeWidth={2} />
          </IconButton>
        }
      />

      <div className="flex flex-1 flex-col gap-5 py-2">
        {/* Summary + allocation bar */}
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:items-center">
          <div className="text-center lg:text-left">
            <div className="text-sm font-medium text-ink-mid">Tu plata realmente disponible</div>
            <BigNumber value={netWorthCents / 100} hidden={!showBalances} size="md" />
            <div className="-mt-2 text-sm text-ink-mid">
              {showBalances ? (
                <>
                  tienes{' '}
                  <Money value={liquidCents / 100} className="text-ink" /> · debes{' '}
                  <Money value={debtCents / 100} className="text-danger" />
                </>
              ) : (
                '•••• · ••••'
              )}
            </div>
          </div>

          <Card>
            <div className="flex h-3.5 overflow-hidden rounded-full bg-line-soft">
              <div className="bg-accent" style={{ flex: freeWeight / totalWeight }} />
              <div className="bg-accent-bg" style={{ flex: goalsTotalCents / totalWeight }} />
              <div className="bg-danger" style={{ flex: debtCents / totalWeight, opacity: 0.75 }} />
            </div>
            <div className="mt-3 flex flex-wrap gap-4 text-xs text-ink-mid">
              <LegendDot color="accent" label="libre" />
              <LegendDot color="accent-bg" label="frascos" />
              <LegendDot color="danger" label="deuda" />
            </div>
          </Card>
        </div>

        {/* Accounts — always rendered as a responsive card grid */}
        <div>
          <SectionHeader title="Tus cuentas" />
          {loading ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-2xl" />
              ))}
            </div>
          ) : accounts.length === 0 ? (
            <EmptyState
              icon={<Wallet size={22} strokeWidth={1.8} />}
              title="Aún no tienes cuentas"
              hint="Agrega la primera para ver tu plata en un solo lugar."
              action={
                <Btn kind="primary" onClick={onAddAccount}>
                  <Plus size={16} strokeWidth={2.2} />
                  Agregar cuenta
                </Btn>
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {accounts.map((a) => (
                <AccountCard key={a.id} account={a} showBalances={showBalances} />
              ))}
            </div>
          )}
        </div>
      </div>

      <TabBar />
    </PhoneShell>
  )
}

interface AccountCardProps {
  account: FinancialAccountDTO
  showBalances: boolean
}

function AccountCard({ account, showBalances }: AccountCardProps) {
  const isNegative = account.balanceCents < 0
  const meta = [ACCOUNT_LABEL[account.type] ?? account.type, account.institution]
    .filter(Boolean)
    .join(' · ')

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent-bg text-lg">
          {ACCOUNT_EMOJI[account.type] ?? '·'}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-ink">{account.name}</div>
          <div className="truncate text-xs text-ink-mid">
            {meta}
            {account.last4 ? <span> ·· {account.last4}</span> : null}
          </div>
        </div>
      </div>
      <Money
        value={account.balanceCents / 100}
        hidden={!showBalances}
        weight="semibold"
        className={isNegative ? 'text-lg text-danger' : 'text-lg text-ink'}
      />
    </Card>
  )
}

interface LegendDotProps {
  color: 'accent' | 'accent-bg' | 'danger'
  label: string
}

function LegendDot({ color, label }: LegendDotProps) {
  const cls = {
    accent: 'bg-accent',
    'accent-bg': 'bg-accent-bg',
    danger: 'bg-danger opacity-75',
  }[color]
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-block h-2.5 w-2.5 rounded-full ${cls}`} aria-hidden />
      {label}
    </span>
  )
}
