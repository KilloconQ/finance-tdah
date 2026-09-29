import { useState } from 'react'
import { Package, Pencil, Plus, Trash2 } from 'lucide-react'
import type { EnvelopeDTO, FinancialAccountDTO } from '@finance-tdah/shared/schemas'
import {
  accountSupportsEnvelopes,
  allocatedCents,
  envelopeAdjustmentError,
  parseAmountToCents,
  unassignedCents,
  type EnvelopeAdjustmentError,
} from '@finance-tdah/shared/domain'
import { AppBar, Btn, Card, Chip, EmptyState, IconButton, Money, PhoneShell, SectionHeader } from '@/components'
import { formatMoney } from '@/lib/format'

const ENVELOPE_EMOJIS = ['📦', '🛒', '🏠', '🚗', '🎉', '💊', '📺', '✈️', '🎁', '🐷']

/** Anything that returns a promise rejecting with a user-facing Error. */
type Action<T> = (input: T) => Promise<unknown>

interface EnvelopesViewProps {
  account: FinancialAccountDTO
  envelopes: EnvelopeDTO[]
  showBalances: boolean
  onBack: () => void
  onCreate: Action<{ name: string; emoji: string; amountCents: number }>
  onAdjust: Action<{ id: string; deltaCents: number }>
  onRename: Action<{ id: string; name: string; emoji: string }>
  onDelete: Action<string>
}

function ruleMessage(code: EnvelopeAdjustmentError, unassigned: number, envelopeBalance: number): string {
  switch (code) {
    case 'CREDIT_ACCOUNT':
      return 'Las tarjetas de crédito no llevan cajitas.'
    case 'EXCEEDS_UNASSIGNED':
      return unassigned > 0
        ? `Solo quedan ${formatMoney(unassigned / 100)} sin apartar.`
        : 'Ya apartaste todo lo que tiene esta cuenta.'
    case 'EXCEEDS_ENVELOPE':
      return envelopeBalance > 0
        ? `La cajita solo tiene ${formatMoney(envelopeBalance / 100)}.`
        : 'La cajita no tiene dinero para liberar.'
  }
}

const errorText = (err: unknown, fallback: string) => (err instanceof Error && err.message ? err.message : fallback)

export function EnvelopesView({
  account,
  envelopes,
  showBalances,
  onBack,
  onCreate,
  onAdjust,
  onRename,
  onDelete,
}: EnvelopesViewProps) {
  const balances = envelopes.map((e) => e.balanceCents)
  const allocated = allocatedCents(balances)
  const unassigned = unassignedCents(account.balanceCents, balances)
  const [creating, setCreating] = useState(false)

  if (!accountSupportsEnvelopes(account.type)) {
    return (
      <PhoneShell variant="narrow">
        <AppBar title="Cajitas" back onBack={onBack} />
        <EmptyState
          className="flex-1"
          icon={<Package size={22} strokeWidth={1.8} />}
          title="Las tarjetas de crédito no llevan cajitas"
          hint="Su saldo es deuda: no hay dinero que apartar."
        />
      </PhoneShell>
    )
  }

  return (
    <PhoneShell variant="narrow">
      <AppBar title="Cajitas" back onBack={onBack} />

      <div className="flex flex-1 flex-col gap-5 py-2">
        <Card>
          <div className="text-sm font-medium text-ink">{account.name}</div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <Stat label="En la cuenta" cents={account.balanceCents} hidden={!showBalances} />
            <Stat label="Bloqueado" cents={allocated} hidden={!showBalances} />
            <Stat
              label="Disponible"
              cents={unassigned}
              hidden={!showBalances}
              className={unassigned < 0 ? 'text-danger' : 'text-good'}
            />
          </div>
          {unassigned < 0 ? (
            <p className="mt-3 rounded-xl bg-danger-bg px-3 py-2 text-sm text-danger">
              Apartaste más de lo que tiene la cuenta. Libera {showBalances ? formatMoney(-unassigned / 100) : 'algo'} de
              alguna cajita.
            </p>
          ) : null}
        </Card>

        <div>
          <SectionHeader
            title="Tus cajitas"
            action={
              creating ? null : (
                <Btn kind="plain" className="h-auto px-0 text-accent-strong" onClick={() => setCreating(true)}>
                  <Plus size={16} strokeWidth={2.2} />
                  Nueva cajita
                </Btn>
              )
            }
          />

          <div className="flex flex-col gap-3">
            {creating ? (
              <NewEnvelopeForm
                account={account}
                otherBalances={balances}
                unassigned={unassigned}
                onCancel={() => setCreating(false)}
                onCreate={(input) => onCreate(input).then(() => setCreating(false))}
              />
            ) : null}

            {envelopes.length === 0 && !creating ? (
              <EmptyState
                icon={<Package size={22} strokeWidth={1.8} />}
                title="Aún no tienes cajitas"
                hint="Aparta dinero de esta cuenta para algo: la renta, el súper, un viaje. Queda bloqueado hasta que lo liberes."
                action={
                  <Btn kind="primary" onClick={() => setCreating(true)}>
                    <Plus size={16} strokeWidth={2.2} />
                    Nueva cajita
                  </Btn>
                }
              />
            ) : null}

            {envelopes.map((e) => (
              <EnvelopeCard
                key={e.id}
                account={account}
                envelope={e}
                otherBalances={envelopes.filter((o) => o.id !== e.id).map((o) => o.balanceCents)}
                unassigned={unassigned}
                showBalances={showBalances}
                onAdjust={onAdjust}
                onRename={onRename}
                onDelete={onDelete}
              />
            ))}
          </div>
        </div>
      </div>
    </PhoneShell>
  )
}

function Stat({ label, cents, hidden, className }: { label: string; cents: number; hidden: boolean; className?: string }) {
  return (
    <div>
      <div className="text-xs text-ink-mid">{label}</div>
      <Money value={cents / 100} hidden={hidden} weight="semibold" className={className ?? 'text-ink'} />
    </div>
  )
}

function AmountField({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium text-ink-mid">
        {label}
      </label>
      <input
        id={id}
        inputMode="decimal"
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0"
        className="mt-1.5 w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm text-ink outline-none transition-colors placeholder:text-ink-soft focus:border-accent"
      />
    </div>
  )
}

function EmojiPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Ícono">
      {ENVELOPE_EMOJIS.map((em) => (
        <Chip key={em} active={value === em} onClick={() => onChange(em)} className="px-2.5">
          {em}
        </Chip>
      ))}
    </div>
  )
}

interface NewEnvelopeFormProps {
  account: FinancialAccountDTO
  otherBalances: number[]
  unassigned: number
  onCancel: () => void
  onCreate: Action<{ name: string; emoji: string; amountCents: number }>
}

function NewEnvelopeForm({ account, otherBalances, unassigned, onCancel, onCreate }: NewEnvelopeFormProps) {
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState(ENVELOPE_EMOJIS[0])
  const [amount, setAmount] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const amountCents = amount.trim() === '' ? 0 : parseAmountToCents(amount)
  const rule =
    amountCents === null
      ? null
      : envelopeAdjustmentError({
          accountType: account.type,
          accountBalanceCents: account.balanceCents,
          otherEnvelopeBalancesCents: otherBalances,
          envelopeBalanceCents: 0,
          deltaCents: amountCents,
        })
  const problem =
    amountCents === null ? 'El monto no es válido.' : rule ? ruleMessage(rule, unassigned, 0) : null
  const canSubmit = name.trim() !== '' && !problem && !pending

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit || amountCents === null) return
    setPending(true)
    setError(null)
    onCreate({ name: name.trim(), emoji, amountCents })
      .catch((err: unknown) => setError(errorText(err, 'No pudimos crear la cajita')))
      .finally(() => setPending(false))
  }

  return (
    <Card>
      <form onSubmit={submit} className="flex flex-col gap-4" aria-label="Nueva cajita">
        <div>
          <label htmlFor="envelope-name" className="text-sm font-medium text-ink-mid">
            Para qué es
          </label>
          <input
            id="envelope-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            autoFocus
            placeholder="Ej: Renta, Súper, Viaje"
            className="mt-1.5 w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm text-ink outline-none transition-colors placeholder:text-ink-soft focus:border-accent"
          />
        </div>
        <EmojiPicker value={emoji} onChange={setEmoji} />
        <AmountField id="envelope-amount" label="Cuánto apartar (opcional)" value={amount} onChange={setAmount} />
        <p className="-mt-2 text-xs text-ink-mid">Sin apartar en la cuenta: {formatMoney(Math.max(0, unassigned) / 100)}</p>
        {problem || error ? <p className="rounded-xl bg-danger-bg px-3 py-2 text-sm text-danger">{error ?? problem}</p> : null}
        <div className="flex gap-2">
          <Btn kind="primary" type="submit" disabled={!canSubmit} className="flex-1">
            {pending ? 'Creando…' : 'Crear cajita'}
          </Btn>
          <Btn onClick={onCancel}>Cancelar</Btn>
        </div>
      </form>
    </Card>
  )
}

type Mode = 'idle' | 'add' | 'release' | 'rename' | 'delete'

interface EnvelopeCardProps {
  account: FinancialAccountDTO
  envelope: EnvelopeDTO
  otherBalances: number[]
  unassigned: number
  showBalances: boolean
  onAdjust: Action<{ id: string; deltaCents: number }>
  onRename: Action<{ id: string; name: string; emoji: string }>
  onDelete: Action<string>
}

function EnvelopeCard({
  account,
  envelope,
  otherBalances,
  unassigned,
  showBalances,
  onAdjust,
  onRename,
  onDelete,
}: EnvelopeCardProps) {
  const [mode, setMode] = useState<Mode>('idle')
  const [amount, setAmount] = useState('')
  const [name, setName] = useState(envelope.name)
  const [emoji, setEmoji] = useState(envelope.emoji)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const open = (next: Mode) => {
    setMode(next)
    setAmount('')
    setName(envelope.name)
    setEmoji(envelope.emoji)
    setError(null)
  }

  const run = (action: Promise<unknown>, fallback: string) => {
    setPending(true)
    setError(null)
    action
      .then(() => setMode('idle'))
      .catch((err: unknown) => setError(errorText(err, fallback)))
      .finally(() => setPending(false))
  }

  const overspent = envelope.balanceCents < 0
  const amountCents = parseAmountToCents(amount)
  const deltaCents = amountCents === null ? null : mode === 'release' ? -amountCents : amountCents
  const rule =
    deltaCents === null
      ? null
      : envelopeAdjustmentError({
          accountType: account.type,
          accountBalanceCents: account.balanceCents,
          otherEnvelopeBalancesCents: otherBalances,
          envelopeBalanceCents: envelope.balanceCents,
          deltaCents,
        })
  const problem = amount.trim() !== '' && deltaCents === null ? 'El monto no es válido.' : rule ? ruleMessage(rule, unassigned, envelope.balanceCents) : null

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent-bg text-lg" aria-hidden>
          {envelope.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-ink">{envelope.name}</div>
          {overspent ? (
            <div className="text-xs text-danger">
              te pasaste por {showBalances ? formatMoney(-envelope.balanceCents / 100) : '••••'}
            </div>
          ) : null}
        </div>
        <Money
          value={envelope.balanceCents / 100}
          hidden={!showBalances}
          weight="semibold"
          className={overspent ? 'text-lg text-danger' : 'text-lg text-ink'}
        />
      </div>

      {mode === 'idle' ? (
        <div className="flex items-center gap-2">
          <Btn className="h-9 flex-1" onClick={() => open('add')}>
            Apartar
          </Btn>
          <Btn className="h-9 flex-1" onClick={() => open('release')} disabled={envelope.balanceCents <= 0}>
            Liberar
          </Btn>
          <IconButton onClick={() => open('rename')} label={`Renombrar ${envelope.name}`}>
            <Pencil size={16} strokeWidth={2} />
          </IconButton>
          <IconButton onClick={() => open('delete')} label={`Borrar ${envelope.name}`}>
            <Trash2 size={16} strokeWidth={2} />
          </IconButton>
        </div>
      ) : null}

      {mode === 'add' || mode === 'release' ? (
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            if (deltaCents === null || problem || pending) return
            run(onAdjust({ id: envelope.id, deltaCents }), 'No pudimos mover el dinero')
          }}
        >
          <AmountField
            id={`adjust-${envelope.id}`}
            label={mode === 'add' ? 'Cuánto apartar' : 'Cuánto liberar'}
            value={amount}
            onChange={setAmount}
          />
          <p className="-mt-2 text-xs text-ink-mid">
            {mode === 'add'
              ? `Sin apartar en la cuenta: ${formatMoney(Math.max(0, unassigned) / 100)}`
              : `En la cajita: ${formatMoney(Math.max(0, envelope.balanceCents) / 100)}`}
          </p>
          <FormFooter
            problem={error ?? problem}
            submitLabel={pending ? 'Guardando…' : mode === 'add' ? 'Apartar' : 'Liberar'}
            canSubmit={deltaCents !== null && !problem && !pending}
            onCancel={() => setMode('idle')}
          />
        </form>
      ) : null}

      {mode === 'rename' ? (
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            if (name.trim() === '' || pending) return
            run(onRename({ id: envelope.id, name: name.trim(), emoji }), 'No pudimos guardar los cambios')
          }}
        >
          <label htmlFor={`rename-${envelope.id}`} className="sr-only">
            Nombre
          </label>
          <input
            id={`rename-${envelope.id}`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm text-ink outline-none transition-colors focus:border-accent"
          />
          <EmojiPicker value={emoji} onChange={setEmoji} />
          <FormFooter
            problem={error}
            submitLabel={pending ? 'Guardando…' : 'Guardar'}
            canSubmit={name.trim() !== '' && !pending}
            onCancel={() => setMode('idle')}
          />
        </form>
      ) : null}

      {mode === 'delete' ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-ink-mid">
            ¿Borrar esta cajita? El dinero no se mueve: vuelve a quedar sin apartar en la cuenta.
          </p>
          {error ? <p className="rounded-xl bg-danger-bg px-3 py-2 text-sm text-danger">{error}</p> : null}
          <div className="flex gap-2">
            <Btn
              kind="danger"
              className="flex-1"
              disabled={pending}
              onClick={() => run(onDelete(envelope.id), 'No pudimos borrar la cajita')}
            >
              {pending ? 'Borrando…' : 'Sí, borrar'}
            </Btn>
            <Btn onClick={() => setMode('idle')}>Cancelar</Btn>
          </div>
        </div>
      ) : null}
    </Card>
  )
}

function FormFooter({
  problem,
  submitLabel,
  canSubmit,
  onCancel,
}: {
  problem: string | null
  submitLabel: string
  canSubmit: boolean
  onCancel: () => void
}) {
  return (
    <>
      {problem ? <p className="rounded-xl bg-danger-bg px-3 py-2 text-sm text-danger">{problem}</p> : null}
      <div className="flex gap-2">
        <Btn kind="primary" type="submit" disabled={!canSubmit} className="flex-1">
          {submitLabel}
        </Btn>
        <Btn onClick={onCancel}>Cancelar</Btn>
      </div>
    </>
  )
}
