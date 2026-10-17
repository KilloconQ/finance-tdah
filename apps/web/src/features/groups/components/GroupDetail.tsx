import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { parseAmountToCents } from '@finance-tdah/shared/domain'
import { AppBar, Btn, Card, Money, PhoneShell, Skeleton, TabBar } from '@/components'
import { sessionQuery } from '@/lib/session'
import {
  groupQueryOptions,
  useAddMember,
  useAddSharedExpense,
  useDeleteSharedExpense,
  useSettle,
} from '../api'

const FIELD_CLASS =
  'mt-1.5 w-full rounded-xl border border-line bg-surface px-4 py-3 text-base text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-bg'
const LABEL_CLASS = 'block text-sm font-medium text-ink-mid'
const today = () => new Date().toLocaleDateString('en-CA')
const errorText = (err: unknown, fallback: string) => (err instanceof Error ? err.message : fallback)

export function GroupDetail({ groupId }: { groupId: string }) {
  const navigate = useNavigate()
  const { data, isLoading } = useQuery(groupQueryOptions(groupId))
  const { data: session } = useQuery(sessionQuery)
  const me = session?.user.id

  const addMember = useAddMember(groupId)
  const addExpense = useAddSharedExpense(groupId)
  const deleteExpense = useDeleteSharedExpense(groupId)
  const settle = useSettle(groupId)

  const [email, setEmail] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [paidBy, setPaidBy] = useState('')
  const [excluded, setExcluded] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  if (isLoading || !data) {
    return (
      <PhoneShell>
        <AppBar back onBack={() => navigate({ to: '/groups' })} title="Grupo" />
        <Skeleton className="h-24 w-full" />
        <TabBar />
      </PhoneShell>
    )
  }

  const { group, expenses, balances } = data
  const nameOf = (id: string) => {
    const m = group.members.find((x) => x.userId === id)
    return id === me ? 'Vos' : (m?.name ?? 'Alguien')
  }

  const submitMember = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    addMember.mutate(email.trim(), {
      onSuccess: () => setEmail(''),
      onError: (err) => setError(errorText(err, 'No pudimos agregar a esa persona')),
    })
  }

  const submitExpense = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const amountCents = parseAmountToCents(amount)
    if (amountCents === null || amountCents <= 0) return setError('El monto debe ser mayor a $0')
    const participantIds = group.members.map((m) => m.userId).filter((id) => !excluded.includes(id))
    if (participantIds.length === 0) return setError('Elegí al menos a una persona')
    addExpense.mutate(
      {
        paidBy: paidBy || me || group.members[0].userId,
        description: description.trim(),
        amountCents,
        date: today(),
        participantIds,
      },
      {
        onSuccess: () => {
          setDescription('')
          setAmount('')
          setExcluded([])
        },
        onError: (err) => setError(errorText(err, 'No pudimos guardar el gasto')),
      },
    )
  }

  return (
    <PhoneShell>
      <AppBar back onBack={() => navigate({ to: '/groups' })} title={group.name} />
      <div className="max-w-2xl flex-1 space-y-6 pb-4">
        {error ? <div className="rounded-xl bg-danger-bg px-3 py-2 text-sm text-danger">{error}</div> : null}

        <section>
          <div className="pb-2 text-sm font-medium text-ink-mid">Quién le debe a quién</div>
          {balances.debts.length === 0 ? (
            <Card>Están a mano 🎉</Card>
          ) : (
            <div className="space-y-2">
              {balances.debts.map((d) => (
                <Card key={`${d.from}-${d.to}`} padded={false} className="flex items-center gap-3 p-3">
                  <div className="min-w-0 flex-1 text-sm text-ink">
                    {nameOf(d.from)} {d.from === me ? 'le debés' : 'le debe'} a {nameOf(d.to)}
                  </div>
                  <Money value={d.amountCents / 100} className="text-sm text-ink" />
                  <Btn
                    className="h-9 px-3 text-xs"
                    disabled={settle.isPending}
                    onClick={() =>
                      settle.mutate(
                        { fromUserId: d.from, toUserId: d.to, amountCents: d.amountCents, date: today() },
                        { onError: (err) => setError(errorText(err, 'No pudimos registrar el pago')) },
                      )
                    }
                  >
                    Saldar
                  </Btn>
                </Card>
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="pb-2 text-sm font-medium text-ink-mid">Gastos · {expenses.length}</div>
          <div className="divide-y divide-line-soft overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
            {expenses.map((e) => (
              <div key={e.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-ink">{e.description}</div>
                  <div className="mt-0.5 text-xs text-ink-mid">Pagó {nameOf(e.paidBy).toLowerCase()}</div>
                </div>
                <Money value={e.amountCents / 100} className="text-sm text-ink" />
                {e.paidBy === me || e.createdBy === me ? (
                  <Btn
                    kind="danger"
                    className="h-9 px-3 text-xs"
                    onClick={() =>
                      deleteExpense.mutate(e.id, {
                        onError: (err) => setError(errorText(err, 'No pudimos borrar el gasto')),
                      })
                    }
                  >
                    Borrar
                  </Btn>
                ) : null}
              </div>
            ))}
            {expenses.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-ink-mid">Todavía no hay gastos.</div>
            ) : null}
          </div>
        </section>

        <form onSubmit={submitExpense} className="space-y-4">
          <div className="text-sm font-medium text-ink-mid">Nuevo gasto compartido</div>
          <div>
            <label htmlFor="description" className={LABEL_CLASS}>
              Descripción
            </label>
            <input id="description" value={description} onChange={(e) => setDescription(e.target.value)} className={FIELD_CLASS} />
          </div>
          <div>
            <label htmlFor="amount" className={LABEL_CLASS}>
              Monto (en pesos)
            </label>
            <input id="amount" type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className={FIELD_CLASS} />
          </div>
          <div>
            <label htmlFor="paidBy" className={LABEL_CLASS}>
              Pagó
            </label>
            <select id="paidBy" value={paidBy || me || ''} onChange={(e) => setPaidBy(e.target.value)} className={FIELD_CLASS}>
              {group.members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {nameOf(m.userId)}
                </option>
              ))}
            </select>
          </div>
          <fieldset>
            <legend className={LABEL_CLASS}>Se divide entre</legend>
            {group.members.map((m) => (
              <label key={m.userId} className="mt-1.5 flex items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={!excluded.includes(m.userId)}
                  onChange={(e) =>
                    setExcluded((cur) => (e.target.checked ? cur.filter((x) => x !== m.userId) : [...cur, m.userId]))
                  }
                />
                {nameOf(m.userId)}
              </label>
            ))}
          </fieldset>
          <Btn kind="primary" type="submit" className="w-full" disabled={!description.trim() || !amount || addExpense.isPending}>
            {addExpense.isPending ? 'Guardando…' : 'Agregar gasto'}
          </Btn>
        </form>

        <section>
          <div className="pb-2 text-sm font-medium text-ink-mid">Miembros</div>
          <ul className="space-y-1 text-sm text-ink">
            {group.members.map((m) => (
              <li key={m.userId}>
                {nameOf(m.userId)} <span className="text-ink-mid">· {m.email}</span>
              </li>
            ))}
          </ul>
          <form onSubmit={submitMember} className="mt-3">
            <label htmlFor="member-email" className={LABEL_CLASS}>
              Agregar por email
            </label>
            <input id="member-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={FIELD_CLASS} />
            <Btn type="submit" className="mt-2 w-full" disabled={!email.trim() || addMember.isPending}>
              Agregar miembro
            </Btn>
          </form>
        </section>
      </div>
      <TabBar />
    </PhoneShell>
  )
}
