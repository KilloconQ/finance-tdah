import { useState } from 'react'
import { centsToUnits, isEqualSplit, parseAmountToCents } from '@finance-tdah/shared/domain'
import { MAX_CENTS, type ExpenseGroupDTO, type GroupDetailDTO } from '@finance-tdah/shared/schemas'
import { Btn } from '@/components'
import { errorText } from '@/lib/api'
import { todayLocalISO } from '@/lib/format'
import { useInviteToGroup, useAddSharedExpense, useUpdateSharedExpense } from '../api'
import { Sheet } from './Sheet'
import { useSavingLabel } from '@/lib/use-online'

const FIELD_CLASS =
  'mt-1.5 w-full rounded-xl border border-line bg-surface px-4 py-3 text-base text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-bg'
const LABEL_CLASS = 'block text-sm font-medium text-ink-mid'

function ErrorBox({ message }: { message: string | null }) {
  return message ? <div className="mt-3 rounded-xl bg-danger-bg px-3 py-2 text-sm text-danger">{message}</div> : null
}

type GroupExpense = GroupDetailDTO['expenses'][number]

const centsToInput = (cents: number) => centsToUnits(cents).toFixed(2)

export function ExpenseSheet({
  group,
  me,
  nameOf,
  expense,
  onClose,
}: {
  group: ExpenseGroupDTO
  me: string | undefined
  nameOf: (id: string) => string
  /** When set, the sheet edits this expense instead of creating one. */
  expense?: GroupExpense
  onClose: () => void
}) {
  const savingLabel = useSavingLabel()
  const addExpense = useAddSharedExpense(group.id)
  const updateExpense = useUpdateSharedExpense(group.id)
  const save = expense ? updateExpense : addExpense
  const memberIds = group.members.map((m) => m.userId)

  const [description, setDescription] = useState(expense?.description ?? '')
  const [amount, setAmount] = useState(expense ? centsToInput(expense.amountCents) : '')
  const [paidBy, setPaidBy] = useState(expense?.paidBy ?? me ?? memberIds[0])
  const [participantIds, setParticipantIds] = useState(
    expense ? expense.splits.map((s) => s.userId) : memberIds,
  )
  // An edited expense whose shares aren't the equal split reopens in custom mode.
  const [custom, setCustom] = useState(!!expense && !isEqualSplit(expense.amountCents, expense.splits))
  const [shares, setShares] = useState<Record<string, string>>(
    Object.fromEntries((expense?.splits ?? []).map((s) => [s.userId, centsToInput(s.shareCents)])),
  )
  const [error, setError] = useState<string | null>(null)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const amountCents = parseAmountToCents(amount)
    if (amountCents === null || amountCents <= 0) return setError('El monto debe ser mayor a $0')
    if (amountCents > MAX_CENTS) return setError('El monto es demasiado grande')
    if (participantIds.length === 0) return setError('Elige al menos a una persona')

    const body = {
      paidBy,
      description: description.trim(),
      amountCents,
      date: expense?.date ?? todayLocalISO(),
    }
    const splits = custom
      ? participantIds.map((userId) => ({ userId, shareCents: parseAmountToCents(shares[userId] ?? '') ?? 0 }))
      : null
    if (splits) {
      if (splits.some((s) => s.shareCents > MAX_CENTS)) return setError('El monto es demasiado grande')
      const total = splits.reduce((n, s) => n + s.shareCents, 0)
      if (total !== amountCents) {
        return setError(`Las partes suman $${centsToInput(total)} y el gasto es de $${centsToInput(amountCents)}`)
      }
    }
    const input = { ...body, ...(splits ? { splits } : { participantIds }) }
    const opts = { onSuccess: onClose, onError: (err: unknown) => setError(errorText(err, 'No pudimos guardar el gasto')) }
    if (expense) updateExpense.mutate({ expenseId: expense.id, input }, opts)
    else addExpense.mutate(input, opts)
  }

  return (
    <Sheet title={expense ? 'Editar gasto' : 'Nuevo gasto'} onClose={onClose}>
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
          <select id="paidBy" value={paidBy} onChange={(e) => setPaidBy(e.target.value)} className={FIELD_CLASS}>
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
              <div key={m.userId} className="flex items-center gap-3 px-4 py-3 text-base text-ink">
                <label className="flex min-h-10 flex-1 items-center gap-3">
                  <input
                    type="checkbox"
                    className="size-5"
                    checked={participantIds.includes(m.userId)}
                    onChange={(e) =>
                      setParticipantIds(
                        memberIds.filter((id) => (id === m.userId ? e.target.checked : participantIds.includes(id))),
                      )
                    }
                  />
                  {m.userId === me ? 'Tú' : nameOf(m.userId)}
                </label>
                {custom && participantIds.includes(m.userId) ? (
                  <input
                    aria-label={`Parte de ${m.userId === me ? 'Tú' : nameOf(m.userId)}`}
                    type="number"
                    min="0"
                    step="0.01"
                    value={shares[m.userId] ?? ''}
                    onChange={(e) => setShares((cur) => ({ ...cur, [m.userId]: e.target.value }))}
                    className="w-28 rounded-lg border border-line bg-surface px-3 py-1.5 text-right text-base text-ink"
                  />
                ) : null}
              </div>
            ))}
          </div>
          <label className="mt-2 flex min-h-10 items-center gap-3 px-1 text-sm text-ink-mid">
            <input type="checkbox" className="size-5" checked={custom} onChange={(e) => setCustom(e.target.checked)} />
            Montos personalizados
          </label>
        </fieldset>
        <ErrorBox message={error} />
        <Btn kind="primary" type="submit" className="w-full" disabled={!description.trim() || !amount || save.isPending}>
          {save.isPending ? savingLabel : expense ? 'Guardar cambios' : 'Agregar gasto'}
        </Btn>
      </form>
    </Sheet>
  )
}

export function MemberSheet({ groupId, onClose }: { groupId: string; onClose: () => void }) {
  const invite = useInviteToGroup(groupId)
  const [email, setEmail] = useState('')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    invite.mutate(email.trim())
  }

  return (
    <Sheet title="Invitar miembro" onClose={onClose}>
      {invite.isSuccess ? (
        <div className="pt-2">
          {/* The API answers the same whether or not the address has an account, so this can't say which. */}
          <p className="text-base text-ink-mid">
            Si ese email tiene cuenta, le llegará la invitación. Entrará al grupo cuando la acepte.
          </p>
          <Btn kind="primary" className="mt-4 w-full" onClick={onClose}>
            Listo
          </Btn>
        </div>
      ) : (
        <form onSubmit={submit} className="pt-2">
          <label htmlFor="member-email" className={LABEL_CLASS}>
            Email
          </label>
          <input id="member-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={FIELD_CLASS} />
          <ErrorBox message={invite.isError ? errorText(invite.error, 'No pudimos enviar la invitación') : null} />
          <Btn kind="primary" type="submit" className="mt-4 w-full" disabled={!email.trim() || invite.isPending}>
            Enviar invitación
          </Btn>
        </form>
      )}
    </Sheet>
  )
}

/** Asks before an action that can't be undone; `onConfirm` runs only on the confirm button. */
export function ConfirmSheet({
  title,
  message,
  confirmLabel,
  pending,
  onConfirm,
  onClose,
}: {
  title: string
  message: string
  confirmLabel: string
  pending?: boolean
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <Sheet title={title} onClose={onClose}>
      <p className="pt-2 text-base text-ink-mid">{message}</p>
      <div className="mt-4 flex gap-2">
        <Btn kind="ghost" className="flex-1" onClick={onClose}>
          Cancelar
        </Btn>
        <Btn kind="danger" className="flex-1" disabled={pending} onClick={onConfirm}>
          {confirmLabel}
        </Btn>
      </div>
    </Sheet>
  )
}
