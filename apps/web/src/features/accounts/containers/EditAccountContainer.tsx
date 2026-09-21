import { useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { parseAmountToCents, signedBalanceForType } from '@finance-tdah/shared/domain'
import { AppBar, EmptyState, IconButton, PhoneShell } from '@/components'
import { accountsQueryOptions, useUpdateAccount } from '../api'
import { AccountForm, type AccountFormFields } from '../components/AccountForm'

interface EditAccountContainerProps {
  accountId: string
}

export function EditAccountContainer({ accountId }: EditAccountContainerProps) {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const inFlight = useRef(false)

  const { data: accounts, isLoading } = useQuery(accountsQueryOptions())
  const account = accounts?.find((a) => a.id === accountId)
  const updateAccount = useUpdateAccount(accountId)

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

    if (inFlight.current) return
    inFlight.current = true
    updateAccount.mutate(
      {
        name: fields.name,
        type: fields.type,
        balanceCents,
        institution: fields.institution,
        last4: fields.last4,
      },
      {
        onSuccess: () => navigate({ to: '/accounts', replace: true }),
        onError: (err) => {
          inFlight.current = false
          setError(err instanceof Error ? err.message : 'No pudimos actualizar la cuenta')
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
        }}
        submitLabel="Guardar cambios"
      />
    </PhoneShell>
  )
}
