import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Plus, Receipt } from 'lucide-react'
import {
  AppBar,
  Btn,
  CatDot,
  EmptyState,
  IconButton,
  PhoneShell,
  Row,
  SectionHeader,
  Skeleton,
  TabBar,
} from '@/components'
import { formatMoney } from '@/lib/format'
import { expensesQuery } from '@/lib/queries'
import { queryClient } from '@/lib/query-client'
import { useTweaks } from '@/lib/use-tweaks'

// Single category-icon system: the emoji the data maps to. Unknown categories
// fall back to a neutral coin so the iconography stays consistent.
const CATEGORY_EMOJI: Record<string, string> = {
  café: '☕',
  comida: '🍴',
  transporte: '🚖',
  subs: '🔁',
  ocio: '🎬',
  hogar: '🏠',
  otros: '🪙',
}

const CATEGORY_FALLBACK = '🪙'

export const Route = createFileRoute('/_app/transactions')({
  loader: () => queryClient.ensureQueryData(expensesQuery()),
  component: Transactions,
})

function Transactions() {
  const navigate = useNavigate()
  const { showBalances } = useTweaks()
  const { data: expenses = [], isLoading } = useQuery(expensesQuery())

  const grouped = expenses.reduce<Record<string, typeof expenses>>((acc, e) => {
    const day = e.occurredAt.slice(0, 10)
    acc[day] = acc[day] ? [...acc[day], e] : [e]
    return acc
  }, {})

  const goAdd = () => navigate({ to: '/add-expense' })

  return (
    <PhoneShell>
      <AppBar
        title="Movimientos"
        right={
          <IconButton onClick={goAdd} label="Registrar gasto">
            <Plus size={20} strokeWidth={2} />
          </IconButton>
        }
      />

      {isLoading ? (
        <TransactionsSkeleton />
      ) : expenses.length === 0 ? (
        <EmptyState
          className="flex-1"
          icon={<Receipt size={22} strokeWidth={1.8} />}
          title="Aún no registraste nada"
          hint="Cada gasto que anotes aparecerá aquí, agrupado por día."
          action={
            <Btn kind="primary" onClick={goAdd}>
              Registrar gasto
            </Btn>
          }
        />
      ) : (
        <div className="flex-1 pb-4">
          <div className="max-w-2xl space-y-4">
            {Object.entries(grouped).map(([date, list]) => (
              <div key={date}>
                <SectionHeader title={prettyDate(date)} />
                <div className="rounded-2xl border border-line bg-surface px-4 shadow-card [&>*:last-child]:border-b-0">
                  {list.map((e) => (
                    <Row
                      key={e.id}
                      left={
                        <CatDot
                          char={CATEGORY_EMOJI[e.category] ?? CATEGORY_FALLBACK}
                          tone="neutral"
                        />
                      }
                      title={e.description}
                      sub={e.category}
                      right={
                        <span className="money text-sm font-medium text-ink">
                          {showBalances ? `−${formatMoney(e.amountCents / 100)}` : '••••'}
                        </span>
                      }
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <TabBar />
    </PhoneShell>
  )
}

function TransactionsSkeleton() {
  return (
    <div className="flex-1 pb-4">
      <div className="max-w-2xl space-y-4">
        {Array.from({ length: 2 }).map((_, g) => (
          <div key={g}>
            <Skeleton className="mb-2 h-4 w-32" />
            <div className="overflow-hidden rounded-2xl border border-line bg-surface">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3.5">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-40" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function prettyDate(d: string): string {
  const date = new Date(d + 'T00:00:00')
  return date.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'short' })
}
