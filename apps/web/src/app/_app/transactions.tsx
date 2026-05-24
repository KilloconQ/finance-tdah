import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { AppBar, CatDot, PhoneShell, Row, SectionHeader, TabBar } from '@/components'
import { formatMoney } from '@/lib/format'
import { expensesQuery } from '@/lib/queries'
import { queryClient } from '@/lib/query-client'
import { useTweaks } from '@/lib/use-tweaks'

const CATEGORY_EMOJI: Record<string, string> = {
  café: '☕',
  comida: '🍴',
  transporte: '🚖',
  subs: '🔁',
  ocio: '🎬',
  hogar: '🏠',
  otros: '·',
}

export const Route = createFileRoute('/_app/transactions')({
  loader: () => queryClient.ensureQueryData(expensesQuery()),
  component: Transactions,
})

function Transactions() {
  const navigate = useNavigate()
  const { showBalances } = useTweaks()
  const { data: expenses = [] } = useQuery(expensesQuery())

  const grouped = expenses.reduce<Record<string, typeof expenses>>((acc, e) => {
    const day = e.occurredAt.slice(0, 10)
    acc[day] = acc[day] ? [...acc[day], e] : [e]
    return acc
  }, {})

  return (
    <PhoneShell>
      <AppBar
        title="Movimientos"
        right={
          <button
            type="button"
            onClick={() => navigate({ to: '/add-expense' })}
            className="wf-tap text-[20px] text-ink"
          >
            +
          </button>
        }
      />
      <div className="flex-1 overflow-y-auto pb-4">
        {Object.entries(grouped).map(([date, list]) => (
          <div key={date} className="mt-2">
            <SectionHeader title={prettyDate(date)} />
            {list.map((e) => (
              <Row
                key={e.id}
                left={<CatDot char={CATEGORY_EMOJI[e.category] ?? '·'} tone="neutral" />}
                title={e.description}
                sub={e.category}
                right={
                  <span className="wf-mono text-[14px] text-ink">
                    {showBalances ? `−${formatMoney(e.amountCents / 100)}` : '••••'}
                  </span>
                }
              />
            ))}
          </div>
        ))}
        {expenses.length === 0 ? (
          <div className="flex h-full items-center justify-center pt-20 text-[14px] text-ink-mid">
            Aún no registraste nada esta semana.
          </div>
        ) : null}
      </div>
      <TabBar />
    </PhoneShell>
  )
}

function prettyDate(d: string): string {
  const date = new Date(d + 'T00:00:00')
  return date.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'short' })
}
