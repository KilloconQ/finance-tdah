import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Pencil, Plus, Receipt, Trash2 } from 'lucide-react'
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
import { useDeleteExpense } from '@/features/expenses'
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
  const deleteMutation = useDeleteExpense()
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [justDeleted, setJustDeleted] = useState(false)

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

      {justDeleted ? (
        <div className="mb-3 rounded-xl border border-good/40 bg-good-bg px-4 py-2.5 text-center text-sm font-medium text-good">
          ✓ Gasto borrado
        </div>
      ) : null}

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
                  {list.map((e) =>
                    confirmingId === e.id ? (
                      <div key={e.id} className="border-b border-line-soft py-3.5">
                        <div className="rounded-xl border border-danger bg-danger-bg p-4">
                          <div className="mb-3 text-sm font-medium text-danger">
                            ¿Estás seguro?
                          </div>
                          <div className="mb-4 text-xs text-ink-soft">
                            Esta acción no se puede deshacer.
                          </div>
                          <div className="flex gap-2">
                            <Btn
                              kind="ghost"
                              className="flex-1"
                              onClick={() => setConfirmingId(null)}
                            >
                              Cancelar
                            </Btn>
                            <Btn
                              kind="danger"
                              className="flex-1"
                              onClick={() =>
                                deleteMutation.mutate(e.id, {
                                  onSuccess: () => {
                                    setConfirmingId(null)
                                    setJustDeleted(true)
                                    window.setTimeout(() => setJustDeleted(false), 1400)
                                  },
                                })
                              }
                              disabled={deleteMutation.isPending}
                            >
                              {deleteMutation.isPending ? 'Borrando...' : 'Confirmar'}
                            </Btn>
                          </div>
                        </div>
                      </div>
                    ) : (
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
                          <div className="flex items-center gap-1">
                            <span
                              className={`money text-sm font-medium ${amountToneClass(e.kind)}`}
                            >
                              {showBalances ? amountLabel(e.kind, e.amountCents) : '••••'}
                            </span>
                            <IconButton
                              className="h-8 w-8"
                              onClick={() =>
                                navigate({ to: '/transactions/$id/edit', params: { id: e.id } })
                              }
                              label="Editar gasto"
                            >
                              <Pencil size={16} strokeWidth={2} />
                            </IconButton>
                            <IconButton
                              className="h-8 w-8"
                              onClick={() => setConfirmingId(e.id)}
                              label="Borrar gasto"
                            >
                              <Trash2 size={16} strokeWidth={2} />
                            </IconButton>
                          </div>
                        }
                      />
                    ),
                  )}
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

function amountLabel(kind: 'expense' | 'income' | 'transfer', amountCents: number): string {
  const amount = formatMoney(amountCents / 100)
  if (kind === 'income') return `+${amount}`
  if (kind === 'transfer') return `→ ${amount}`
  return `−${amount}`
}

function amountToneClass(kind: 'expense' | 'income' | 'transfer'): string {
  if (kind === 'income') return 'text-good'
  if (kind === 'transfer') return 'text-ink-mid'
  return 'text-ink'
}

function prettyDate(d: string): string {
  const date = new Date(d + 'T00:00:00')
  return date.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'short' })
}
