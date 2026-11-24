import { useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { parseAmountToCents, signedBalanceForType } from '@finance-tdah/shared/domain'
import { AppBar, Btn, EmptyState, IconButton, PhoneShell } from '@/components'
import { errorText } from '@/lib/api'
import { accountsQueryOptions, accountStatementQueryOptions, useCloseAccount, useUpdateAccount } from '../api'
import { AccountForm, type AccountFormFields } from '../components/AccountForm'
import { CardStatementSummary } from '../components/CardStatementSummary'
import { parseStatementDays } from './statement-days'

interface EditAccountContainerProps {
  accountId: string
}

export function EditAccountContainer({ accountId }: EditAccountContainerProps) {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [confirmClose, setConfirmClose] = useState(false)
  const [closeError, setCloseError] = useState<string | null>(null)
  const inFlight = useRef(false)

  const { data: accounts, isLoading } = useQuery(accountsQueryOptions())
  const account = accounts?.find((a) => a.id === accountId)
  const updateAccount = useUpdateAccount(accountId)
  const closeAccount = useCloseAccount(accountId)
  const hasStatementDays = account?.type === 'credito' && account.cutoffDay !== null && account.paymentDay !== null
  const { data: statement } = useQuery({ ...accountStatementQueryOptions(accountId), enabled: hasStatementDays })

  if (isLoading) {
    return (
      <PhoneShell variant="narrow">
        <AppBar title="Editar cuenta" back onBack={() => navigate({ to: '/accounts' })} />
        <div className="flex flex-1 items-center justify-center text-sm text-ink-mid">
          Cargando…
        </div>
      </PhoneShell>
    )
  }

  if (!account) {
    return (
      <PhoneShell variant="narrow">
        <AppBar title="Editar cuenta" back onBack={() => navigate({ to: '/accounts' })} />
        <EmptyState
          className="flex-1"
          title="No encontramos esa cuenta"
          hint="Puede que la hayas eliminado o que el enlace esté roto."
        />
      </PhoneShell>
    )
  }

  const handleSubmit = (fields: AccountFormFields) => {
    setError(null)

    const magnitudeCents = fields.balance.trim() === '' ? 0 : parseAmountToCents(fields.balance)
    if (magnitudeCents === null) {
      setError('El saldo no es válido')
      return
    }

    // Preserve the account's existing sign when the type is unchanged and it
    // actually has one, so an account tracked outside the type's canonical
    // sign (e.g. an overdrawn debit account) doesn't get silently flipped by
    // an unrelated edit. A zero balance has no sign to preserve, and changing
    // the type is a deliberate re-signing — both fall back to the canonical
    // sign for the type, matching the pre-edit create behavior.
    const balanceCents =
      fields.type === account.type && account.balanceCents !== 0
        ? account.balanceCents < 0
          ? -magnitudeCents
          : magnitudeCents
        : signedBalanceForType(fields.type, magnitudeCents)

    const days = parseStatementDays(fields.type, fields.cutoffDay, fields.paymentDay)
    if (!days.ok) {
      setError(days.error)
      return
    }

    if (inFlight.current) return
    inFlight.current = true
    updateAccount.mutate(
      {
        name: fields.name,
        type: fields.type,
        balanceCents,
        institution: fields.institution,
        last4: fields.last4,
        // A credit card sends null to clear its days; the API clears them on any other type.
        ...(fields.type === 'credito' ? { cutoffDay: days.cutoffDay, paymentDay: days.paymentDay } : {}),
      },
      {
        onSuccess: () => navigate({ to: '/accounts', replace: true }),
        onError: (err) => {
          inFlight.current = false
          setError(errorText(err, 'No pudimos actualizar la cuenta'))
        },
      },
    )
  }

  return (
    <PhoneShell variant="narrow">
      <AppBar
        title="Editar cuenta"
        left={
          <IconButton onClick={() => navigate({ to: '/accounts' })} label="Cerrar">
            <X size={20} strokeWidth={2} />
          </IconButton>
        }
      />
      {statement && hasStatementDays ? <CardStatementSummary statement={statement} /> : null}
      <AccountForm
        submitting={updateAccount.isPending}
        error={error}
        onSubmit={handleSubmit}
        initial={{
          name: account.name,
          type: account.type,
          balance: String(Math.abs(account.balanceCents) / 100),
          institution: account.institution ?? undefined,
          last4: account.last4 ?? undefined,
          cutoffDay: account.cutoffDay?.toString(),
          paymentDay: account.paymentDay?.toString(),
        }}
        submitLabel="Guardar cambios"
      />
      <div className="px-5 pb-8">
        {!confirmClose ? (
          <Btn kind="plain" className="w-full" onClick={() => setConfirmClose(true)}>
            Cerrar cuenta
          </Btn>
        ) : (
          <div className="rounded-xl border border-danger bg-danger-bg p-4">
            <div className="mb-1 text-sm font-medium text-danger">¿Cerrar {account.name}?</div>
            <div className="mb-4 text-xs text-ink-soft">
              Dejará de aparecer en tus cuentas y en tu total. Sus movimientos pasados se conservan.
            </div>
            {closeError ? <div className="mb-3 text-xs text-danger">{closeError}</div> : null}
            <div className="flex gap-2">
              <Btn kind="ghost" className="flex-1" onClick={() => setConfirmClose(false)}>
                Cancelar
              </Btn>
              <Btn
                kind="danger"
                className="flex-1"
                disabled={closeAccount.isPending}
                onClick={() => {
                  setCloseError(null)
                  closeAccount.mutate(undefined, {
                    onSuccess: () => navigate({ to: '/accounts', replace: true }),
                    onError: (err) => setCloseError(errorText(err, 'No pudimos cerrar la cuenta')),
                  })
                }}
              >
                {closeAccount.isPending ? 'Cerrando…' : 'Cerrar cuenta'}
              </Btn>
            </div>
          </div>
        )}
      </div>
    </PhoneShell>
  )
}
