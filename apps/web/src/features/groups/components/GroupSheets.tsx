import { useState } from 'react'
import { parseAmountToCents } from '@finance-tdah/shared/domain'
import type { ExpenseGroupDTO } from '@finance-tdah/shared/schemas'
import { Btn } from '@/components'
import { useAddMember, useAddSharedExpense } from '../api'
import { Sheet } from './Sheet'

const FIELD_CLASS =
  'mt-1.5 w-full rounded-xl border border-line bg-surface px-4 py-3 text-base text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-bg'
const LABEL_CLASS = 'block text-sm font-medium text-ink-mid'
const today = () => new Date().toLocaleDateString('en-CA')
const errorText = (err: unknown, fallback: string) => (err instanceof Error ? err.message : fallback)

function ErrorBox({ message }: { message: string | null }) {
  return message ? <div className="mt-3 rounded-xl bg-danger-bg px-3 py-2 text-sm text-danger">{message}</div> : null
}

export function ExpenseSheet({
  group,
  me,
  nameOf,
  onClose,
}: {
  group: ExpenseGroupDTO
  me: string | undefined
  nameOf: (id: string) => string
  onClose: () => void
}) {
  const addExpense = useAddSharedExpense(group.id)
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [paidBy, setPaidBy] = useState('')
  const [excluded, setExcluded] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const amountCents = parseAmountToCents(amount)
    if (amountCents === null || amountCents <= 0) return setError('El monto debe ser mayor a $0')
    const participantIds = group.members.map((m) => m.userId).filter((id) => !excluded.includes(id))
    if (participantIds.length === 0) return setError('Elige al menos a una persona')
    addExpense.mutate(
      {
        paidBy: paidBy || me || group.members[0].userId,
        description: description.trim(),
        amountCents,
        date: today(),
        participantIds,
      },
      { onSuccess: onClose, onError: (err) => setError(errorText(err, 'No pudimos guardar el gasto')) },
    )
  }

  return (
    <Sheet title="Nuevo gasto" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4 pt-2">
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
                {m.userId === me ? 'Tú' : nameOf(m.userId)}
              </option>
            ))}
          </select>
        </div>
        <fieldset>
          <legend className={LABEL_CLASS}>Se divide entre</legend>
          <div className="mt-1.5 divide-y divide-line-soft overflow-hidden rounded-xl border border-line bg-surface">
            {group.members.map((m) => (
              <label key={m.userId} className="flex items-center gap-3 px-4 py-3 text-base text-ink">
                <input
                  type="checkbox"
                  checked={!excluded.includes(m.userId)}
                  onChange={(e) =>
                    setExcluded((cur) => (e.target.checked ? cur.filter((x) => x !== m.userId) : [...cur, m.userId]))
                  }
                />
                {m.userId === me ? 'Tú' : nameOf(m.userId)}
              </label>
            ))}
          </div>
        </fieldset>
        <ErrorBox message={error} />
        <Btn kind="primary" type="submit" className="w-full" disabled={!description.trim() || !amount || addExpense.isPending}>
          {addExpense.isPending ? 'Guardando…' : 'Agregar gasto'}
        </Btn>
      </form>
    </Sheet>
  )
}

export function MemberSheet({ groupId, onClose }: { groupId: string; onClose: () => void }) {
  const addMember = useAddMember(groupId)
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    addMember.mutate(email.trim(), {
      onSuccess: onClose,
      onError: (err) => setError(errorText(err, 'No pudimos agregar a esa persona')),
    })
  }

  return (
    <Sheet title="Agregar miembro" onClose={onClose}>
      <form onSubmit={submit} className="pt-2">
        <label htmlFor="member-email" className={LABEL_CLASS}>
          Email
        </label>
        <input id="member-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={FIELD_CLASS} />
        <ErrorBox message={error} />
        <Btn kind="primary" type="submit" className="mt-4 w-full" disabled={!email.trim() || addMember.isPending}>
          Agregar miembro
        </Btn>
      </form>
    </Sheet>
  )
}
