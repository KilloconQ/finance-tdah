import { useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { X } from 'lucide-react'
import { parseAmountToCents, signedBalanceForType } from '@finance-tdah/shared/domain'
import { AppBar, IconButton, PhoneShell } from '@/components'
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
    <PhoneShell variant="narrow">
      <AppBar
        title="Nueva cuenta"
        left={
          <IconButton onClick={() => navigate({ to: '/accounts' })} label="Cerrar">
            <X size={20} strokeWidth={2} />
          </IconButton>
        }
      />
      <AccountForm submitting={createAccount.isPending} error={error} onSubmit={handleSubmit} />
    </PhoneShell>
  )
}
