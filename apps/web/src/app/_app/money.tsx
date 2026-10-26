import type { ReactNode } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { PiggyBank, Repeat, Wallet } from 'lucide-react'
import { jarProgress, monthlyCostCents, netWorth } from '@finance-tdah/shared/domain'
import { AppBar, EmptyState, Money, PhoneShell, Skeleton, TabBar } from '@/components'
import { goalsQueryOptions } from '@/features/goals'
import { subscriptionsQueryOptions } from '@/features/subscriptions'
import { accountsQuery } from '@/lib/queries'
import { queryClient } from '@/lib/query-client'
import { cn } from '@/lib/cn'
import { useTweaks } from '@/lib/use-tweaks'

export const Route = createFileRoute('/_app/money')({
  loader: () => {
    void queryClient.prefetchQuery(accountsQuery())
    void queryClient.prefetchQuery(goalsQueryOptions())
    void queryClient.prefetchQuery(subscriptionsQueryOptions())
  },
  component: MoneyHub,
})

const SECTION = {
  accounts: 'money-accounts',
  goals: 'money-goals',
  subscriptions: 'money-subscriptions',
} as const

const ROW = 'flex min-h-13 items-center justify-between gap-3 px-4 py-3 text-ink transition-colors hover:bg-bg-alt'
const PRIMARY_LINK =
  'wf-tap inline-flex h-11 items-center justify-center rounded-xl border border-accent bg-accent px-4 text-sm font-medium text-surface shadow-card hover:bg-accent-strong'

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/**
 * The "Dinero" tab: accounts, jars and subscriptions in one scroll, so none of
 * them hides behind a menu. The tiles on top keep all three visible at once.
 */
function MoneyHub() {
  const { showBalances } = useTweaks()
  const hidden = !showBalances

  const accounts = useQuery(accountsQuery())
  const goals = useQuery(goalsQueryOptions())
  const subs = useQuery(subscriptionsQueryOptions())

  const accountList = accounts.data ?? []
  const goalList = goals.data ?? []
  const subList = subs.data ?? []

  // Same rule as the accounts screen: a card's debt is not money you have.
  const { liquidCents } = netWorth(accountList)
  const savedCents = goalList.reduce((sum, g) => sum + g.currentCents, 0)
  const monthlyCents = subList.reduce((sum, s) => sum + monthlyCostCents(s.amountCents, s.cadence), 0)

  const jump = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  return (
    <PhoneShell>
      <AppBar title="Dinero" />

      <div className="flex max-w-2xl flex-1 flex-col gap-6 pb-4">
        <div className="grid grid-cols-3 gap-2">
          <Tile
            label="Cuentas"
            cents={liquidCents}
            detail={plural(accountList.length, 'cuenta', 'cuentas')}
            loading={accounts.isLoading}
            hidden={hidden}
            onClick={() => jump(SECTION.accounts)}
          />
          <Tile
            label="Frascos"
            cents={savedCents}
            detail={plural(goalList.length, 'frasco', 'frascos')}
            loading={goals.isLoading}
            hidden={hidden}
            onClick={() => jump(SECTION.goals)}
          />
          <Tile
            label="Suscripciones"
            cents={monthlyCents}
            detail={`al mes · ${subList.length}`}
            loading={subs.isLoading}
            hidden={hidden}
            onClick={() => jump(SECTION.subscriptions)}
          />
        </div>

        <Section id={SECTION.accounts} title="Cuentas" to="/accounts">
          {accounts.isLoading ? (
            <Skeleton className="h-28 w-full rounded-2xl" />
          ) : accountList.length === 0 ? (
            <EmptyState
              icon={<Wallet size={22} strokeWidth={1.8} />}
              title="Aún no tienes cuentas"
              hint="Agrega tu tarjeta o tu efectivo para saber cuánto tienes."
              action={
                <Link to="/accounts/new" className={PRIMARY_LINK}>
                  Agregar cuenta
                </Link>
              }
            />
          ) : (
            <List>
              {accountList.map((a) => (
                <li key={a.id}>
                  <Link to="/accounts/$id" params={{ id: a.id }} className={ROW}>
                    <span className="min-w-0 truncate">{a.name}</span>
                    <Money
                      value={a.balanceCents / 100}
                      hidden={hidden}
                      className={a.balanceCents < 0 ? 'text-danger' : 'text-ink'}
                    />
                  </Link>
                </li>
              ))}
            </List>
          )}
        </Section>

        <Section id={SECTION.goals} title="Frascos" to="/goals">
          {goals.isLoading ? (
            <Skeleton className="h-28 w-full rounded-2xl" />
          ) : goalList.length === 0 ? (
            <EmptyState
              icon={<PiggyBank size={22} strokeWidth={1.8} />}
              title="Aún no tienes un frasco"
              hint="Crea un frasco para empezar a guardar."
              action={
                <Link to="/goals/new" className={PRIMARY_LINK}>
                  Crear frasco
                </Link>
              }
            />
          ) : (
            <List>
              {goalList.map((g) => (
                <li key={g.id}>
                  <Link to="/goals/$id" params={{ id: g.id }} className={cn(ROW, 'flex-col items-stretch gap-2')}>
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="min-w-0 truncate">{`${g.emoji} ${g.name}`}</span>
                      <span className="shrink-0 text-sm text-ink-mid">
                        <Money value={g.currentCents / 100} hidden={hidden} className="text-ink" /> /{' '}
                        <Money value={g.targetCents / 100} hidden={hidden} weight="regular" />
                      </span>
                    </span>
                    <span className="flex h-2 overflow-hidden rounded-full bg-line-soft" aria-hidden>
                      <span
                        className="rounded-full bg-accent"
                        style={{ width: `${jarProgress(g).fraction * 100}%` }}
                      />
                    </span>
                  </Link>
                </li>
              ))}
            </List>
          )}
        </Section>

        <Section id={SECTION.subscriptions} title="Suscripciones" to="/subscriptions">
          {subs.isLoading ? (
            <Skeleton className="h-28 w-full rounded-2xl" />
          ) : subList.length === 0 ? (
            <EmptyState
              icon={<Repeat size={22} strokeWidth={1.8} />}
              title="Aún no sigues ninguna suscripción"
              hint="Agrega las que pagas cada mes y detecta las que ya no usas."
              action={
                <Link to="/subscriptions/new" className={PRIMARY_LINK}>
                  Agregar suscripción
                </Link>
              }
            />
          ) : (
            <List>
              {subList.map((s) => (
                <li key={s.id}>
                  <Link to="/subscriptions/$id" params={{ id: s.id }} className={ROW}>
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate">{s.name}</span>
                      {s.unused ? <span className="text-xs text-warn">Sin usar</span> : null}
                    </span>
                    <span className="shrink-0 text-sm text-ink-mid">
                      <Money
                        value={monthlyCostCents(s.amountCents, s.cadence) / 100}
                        hidden={hidden}
                        className="text-ink"
                      />
                      /mes
                    </span>
                  </Link>
                </li>
              ))}
            </List>
          )}
        </Section>
      </div>

      <TabBar />
    </PhoneShell>
  )
}

function Tile({
  label,
  cents,
  detail,
  loading,
  hidden,
  onClick,
}: {
  label: string
  cents: number
  detail: string
  loading: boolean
  hidden: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="wf-tap flex min-w-0 flex-col items-start gap-0.5 rounded-2xl border border-line bg-surface p-3 text-left shadow-card transition-colors hover:bg-bg-alt"
    >
      <span className="max-w-full truncate text-xs text-ink-mid">{label}</span>
      {loading ? (
        <Skeleton className="my-0.5 h-5 w-16" />
      ) : (
        <Money value={cents / 100} hidden={hidden} weight="semibold" className="text-sm text-ink min-[360px]:text-base" />
      )}
      <span className="max-w-full truncate text-xs text-ink-mid">{loading ? '…' : detail}</span>
    </button>
  )
}

function Section({
  id,
  title,
  to,
  children,
}: {
  id: string
  title: string
  to: '/accounts' | '/goals' | '/subscriptions'
  children: ReactNode
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-4">
      <div className="flex items-center justify-between px-1">
        <h2 id={`${id}-title`} className="text-xs font-semibold uppercase tracking-wide text-ink-mid">
          {title}
        </h2>
        <Link to={to} className="flex min-h-11 items-center text-sm font-medium text-accent-strong">
          Ver todo
        </Link>
      </div>
      {children}
    </section>
  )
}

function List({ children }: { children: ReactNode }) {
  return (
    <ul className="divide-y divide-line-soft overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
      {children}
    </ul>
  )
}
