import { useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { parseAmountToCents, signedBalanceForType } from '@finance-tdah/shared/domain'
import { AppBar, PhoneShell } from '@/components'
import { useCreateAccount } from '../api'
import { AccountForm, type AccountFormFields } from '../components/AccountForm'

export function NewAccountContainer() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const inFlight = useRef(false)

  const createAccount = useCreateAccount()

  const handleSubmit = (fields: AccountFormFields) => {
    setError(null)

    // An empty balance means a brand-new $0 account; any other value must parse.
    const magnitudeCents = fields.balance.trim() === '' ? 0 : parseAmountToCents(fields.balance)
    if (magnitudeCents === null) {
      setError('El saldo no es válido')
      return
    }

    if (inFlight.current) return
    inFlight.current = true
    createAccount.mutate(
      {
        name: fields.name,
        type: fields.type,
        balanceCents: signedBalanceForType(fields.type, magnitudeCents),
        institution: fields.institution,
        last4: fields.last4,
      },
      {
        onSuccess: () => navigate({ to: '/accounts', replace: true }),
        onError: (err) => {
          inFlight.current = false
          setError(err instanceof Error ? err.message : 'No pudimos crear la cuenta')
        },
      },
    )
  }

  return (
    <PhoneShell>
      <AppBar
        title="Nueva cuenta"
        left={
          <button
            type="button"
            onClick={() => navigate({ to: '/accounts' })}
            className="wf-tap text-[16px] text-ink"
          >
            ✕
          </button>
        }
      />
      <AccountForm submitting={createAccount.isPending} error={error} onSubmit={handleSubmit} />
    </PhoneShell>
  )
}
