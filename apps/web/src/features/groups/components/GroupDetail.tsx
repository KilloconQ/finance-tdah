import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import type { GroupDetailDTO } from '@finance-tdah/shared/schemas'
import { ChevronLeft, LogOut, Pencil, Plus, Trash2, UserPlus } from 'lucide-react'
import { Btn, IconButton, Money, PhoneShell, Skeleton, TabBar } from '@/components'
import { todayLocalISO } from '@/lib/format'
import { sessionQuery } from '@/lib/session'
import { groupQueryOptions, useDeleteSharedExpense, useLeaveGroup, useSettle } from '../api'
import { Avatar } from './Avatar'
import { ConfirmSheet, ExpenseSheet, MemberSheet } from './GroupSheets'

const SECTION = 'px-4 pb-2 text-xs font-medium uppercase tracking-wide text-ink-mid'
const GROUPED = 'divide-y divide-line-soft overflow-hidden rounded-2xl border border-line bg-surface'

export function GroupDetail({ groupId }: { groupId: string }) {
  const navigate = useNavigate()
  const { data, isLoading } = useQuery(groupQueryOptions(groupId))
  const { data: session } = useQuery(sessionQuery)
  const me = session?.user.id

  const deleteExpense = useDeleteSharedExpense(groupId)
  const settle = useSettle(groupId)
  const leave = useLeaveGroup(groupId)
  const [sheet, setSheet] = useState<'expense' | 'member' | 'leave' | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [settling, setSettling] = useState<GroupDetailDTO['balances']['debts'][number] | null>(null)
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
                    onClick={() => setSettling(d)}
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
                    onClick={() => setDeleting(e.id)}
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
            <button
              type="button"
              onClick={() => setSheet('leave')}
              className="wf-tap flex w-full items-center gap-3 px-4 py-3 text-left text-base text-danger"
            >
              <LogOut size={20} strokeWidth={1.9} />
              Salir del grupo
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
      {settling ? (
        <ConfirmSheet
          title="Saldar deuda"
          message={`¿Registrar el pago de ${Math.abs(settling.amountCents / 100).toFixed(2)} de ${nameOf(settling.from)} a ${nameOf(settling.to)}?`}
          confirmLabel="Saldar"
          pending={settle.isPending}
          onClose={() => setSettling(null)}
          onConfirm={() => {
            const { from, to, amountCents } = settling
            setSettling(null)
            settle.mutate(
              { fromUserId: from, toUserId: to, amountCents, date: todayLocalISO() },
              { onError: onError('No pudimos registrar el pago') },
            )
          }}
        />
      ) : null}
      {deleting ? (
        <ConfirmSheet
          title="Borrar gasto"
          message="¿Borrar este gasto? Los saldos se recalculan y no se puede deshacer."
          confirmLabel="Borrar"
          pending={deleteExpense.isPending}
          onClose={() => setDeleting(null)}
          onConfirm={() => {
            const id = deleting
            setDeleting(null)
            deleteExpense.mutate(id, { onError: onError('No pudimos borrar el gasto') })
          }}
        />
      ) : null}
      {sheet === 'leave' ? (
        <ConfirmSheet
          title="Salir del grupo"
          message="¿Salir de este grupo? Solo puedes salir si no tienes deudas pendientes."
          confirmLabel="Salir"
          pending={leave.isPending}
          onClose={() => setSheet(null)}
          onConfirm={() =>
            leave.mutate(undefined, {
              onSuccess: () => navigate({ to: '/groups' }),
              onError: (err) => {
                setSheet(null)
                onError('No pudimos sacarte del grupo')(err)
              },
            })
          }
        />
      ) : null}
      <TabBar />
    </PhoneShell>
  )
}
