import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import type { GroupDetailDTO } from '@finance-tdah/shared/schemas'
import { ChevronLeft, Pencil, Plus, Trash2, UserPlus } from 'lucide-react'
import { Btn, IconButton, Money, PhoneShell, Skeleton, TabBar } from '@/components'
import { sessionQuery } from '@/lib/session'
import { groupQueryOptions, useDeleteSharedExpense, useSettle } from '../api'
import { Avatar } from './Avatar'
import { ExpenseSheet, MemberSheet } from './GroupSheets'

const today = () => new Date().toLocaleDateString('en-CA')
const SECTION = 'px-4 pb-2 text-xs font-medium uppercase tracking-wide text-ink-mid'
const GROUPED = 'divide-y divide-line-soft overflow-hidden rounded-2xl border border-line bg-surface'

export function GroupDetail({ groupId }: { groupId: string }) {
  const navigate = useNavigate()
  const { data, isLoading } = useQuery(groupQueryOptions(groupId))
  const { data: session } = useQuery(sessionQuery)
  const me = session?.user.id

  const deleteExpense = useDeleteSharedExpense(groupId)
  const settle = useSettle(groupId)
  const [sheet, setSheet] = useState<'expense' | 'member' | null>(null)
  const [editing, setEditing] = useState<GroupDetailDTO['expenses'][number] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const back = (
    <IconButton onClick={() => navigate({ to: '/groups' })} label="Volver">
      <ChevronLeft size={22} strokeWidth={2.2} />
    </IconButton>
  )

  if (isLoading || !data) {
    return (
      <PhoneShell>
        <div className="pt-3">{back}</div>
        <Skeleton className="mt-4 h-24 w-full" />
        <TabBar />
      </PhoneShell>
    )
  }

  const { group, expenses, balances } = data
  const nameOf = (id: string) => group.members.find((m) => m.userId === id)?.name ?? 'Alguien'
  const debtLabel = (from: string, to: string) =>
    from === me ? `Le debes a ${nameOf(to)}` : to === me ? `${nameOf(from)} te debe` : `${nameOf(from)} le debe a ${nameOf(to)}`
  const mine = group.myBalanceCents
  const onError = (fallback: string) => (err: unknown) => setError(err instanceof Error ? err.message : fallback)

  return (
    <PhoneShell>
      <div className="pt-3">{back}</div>
      <h1 className="px-1 pb-4 pt-1 text-[34px] font-bold leading-tight tracking-tight text-ink">{group.name}</h1>

      <div className="max-w-2xl flex-1 space-y-6 pb-28">
        {error ? <div className="rounded-xl bg-danger-bg px-3 py-2 text-sm text-danger">{error}</div> : null}

        <section className="rounded-2xl border border-line bg-surface p-4">
          <div className="text-sm text-ink-mid">{mine > 0 ? 'Te deben' : mine < 0 ? 'Debes' : 'Estás al día'}</div>
          <div className={`money text-3xl font-bold tracking-tight ${mine < 0 ? 'text-danger' : 'text-accent-strong'}`}>
            <Money value={Math.abs(mine) / 100} weight="semibold" />
          </div>
        </section>

        <section>
          <div className={SECTION}>Quién le debe a quién</div>
          {balances.debts.length === 0 ? (
            <div className={`${GROUPED} px-4 py-4 text-sm text-ink-mid`}>Están a mano 🎉</div>
          ) : (
            <div className={GROUPED}>
              {balances.debts.map((d) => (
                <div key={`${d.from}-${d.to}`} className="flex items-center gap-3 px-4 py-3">
                  <Avatar name={nameOf(d.from === me ? d.to : d.from)} size="sm" />
                  <div className="min-w-0 flex-1 text-base text-ink">{debtLabel(d.from, d.to)}</div>
                  <Money value={d.amountCents / 100} className="text-base text-ink" />
                  <Btn
                    className="h-8 rounded-full bg-accent-bg px-3 text-sm text-accent-strong shadow-none"
                    disabled={settle.isPending}
                    onClick={() =>
                      settle.mutate(
                        { fromUserId: d.from, toUserId: d.to, amountCents: d.amountCents, date: today() },
                        { onError: onError('No pudimos registrar el pago') },
                      )
                    }
                  >
                    Saldar
                  </Btn>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <div className={SECTION}>Gastos · {expenses.length}</div>
          <div className={GROUPED}>
            {expenses.map((e) => (
              <div key={e.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-base text-ink">{e.description}</div>
                  <div className="mt-0.5 text-sm text-ink-mid">
                    {e.paidBy === me ? 'Pagaste tú' : `Pagó ${nameOf(e.paidBy)}`} · entre {e.splits.length}
                  </div>
                </div>
                <Money value={e.amountCents / 100} className="text-base text-ink" />
                {e.paidBy === me || e.createdBy === me ? (
                  <IconButton label="Editar gasto" onClick={() => setEditing(e)}>
                    <Pencil size={18} strokeWidth={1.9} className="text-ink-mid" />
                  </IconButton>
                ) : null}
                {e.paidBy === me || e.createdBy === me ? (
                  <IconButton
                    label="Borrar gasto"
                    onClick={() => deleteExpense.mutate(e.id, { onError: onError('No pudimos borrar el gasto') })}
                  >
                    <Trash2 size={18} strokeWidth={1.9} className="text-danger" />
                  </IconButton>
                ) : null}
              </div>
            ))}
            {expenses.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-ink-mid">Todavía no hay gastos.</div>
            ) : null}
          </div>
        </section>

        <section>
          <div className={SECTION}>Miembros · {group.members.length}</div>
          <div className={GROUPED}>
            {group.members.map((m) => (
              <div key={m.userId} className="flex items-center gap-3 px-4 py-3">
                <Avatar name={m.name} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-base text-ink">{m.userId === me ? `${m.name} (tú)` : m.name}</div>
                  <div className="truncate text-sm text-ink-mid">{m.email}</div>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setSheet('member')}
              className="wf-tap flex w-full items-center gap-3 px-4 py-3 text-left text-base text-accent-strong"
            >
              <UserPlus size={20} strokeWidth={1.9} />
              Agregar miembro
            </button>
          </div>
        </section>
      </div>

      <div className="sticky bottom-20 z-10 pb-3 md:bottom-4">
        <Btn kind="primary" className="h-12 w-full rounded-2xl text-base" onClick={() => setSheet('expense')}>
          <Plus size={20} strokeWidth={2.4} />
          Agregar gasto
        </Btn>
      </div>

      {sheet === 'expense' ? (
        <ExpenseSheet group={group} me={me} nameOf={nameOf} onClose={() => setSheet(null)} />
      ) : null}
      {editing ? (
        <ExpenseSheet group={group} me={me} nameOf={nameOf} expense={editing} onClose={() => setEditing(null)} />
      ) : null}
      {sheet === 'member' ? <MemberSheet groupId={group.id} onClose={() => setSheet(null)} /> : null}
      <TabBar />
    </PhoneShell>
  )
}
