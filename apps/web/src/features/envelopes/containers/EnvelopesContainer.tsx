import { useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { AppBar, EmptyState, PhoneShell } from '@/components'
import { accountsQueryOptions } from '@/features/accounts/api'
import { useTweaks } from '@/lib/use-tweaks'
import { envelopesQueryOptions, useAdjustEnvelope, useCreateEnvelope, useDeleteEnvelope, useUpdateEnvelope } from '../api'
import { EnvelopesView } from '../components/EnvelopesView'

export function EnvelopesContainer({ accountId }: { accountId: string }) {
  const navigate = useNavigate()
  const { showBalances } = useTweaks()
  const { data: accounts, isLoading: loadingAccounts } = useQuery(accountsQueryOptions())
  const { data: envelopes, isLoading: loadingEnvelopes } = useQuery(envelopesQueryOptions())
  const createEnvelope = useCreateEnvelope()
  const adjustEnvelope = useAdjustEnvelope()
  const updateEnvelope = useUpdateEnvelope()
  const deleteEnvelope = useDeleteEnvelope()

  const onBack = () => navigate({ to: '/accounts' })
  const account = accounts?.find((a) => a.id === accountId)

  if (loadingAccounts || loadingEnvelopes || !account) {
    return (
      <PhoneShell variant="narrow">
        <AppBar title="Cajitas" back onBack={onBack} />
        {loadingAccounts || loadingEnvelopes ? (
          <div className="flex flex-1 items-center justify-center text-sm text-ink-mid">Cargando…</div>
        ) : (
          <EmptyState
            className="flex-1"
            title="No encontramos esa cuenta"
            hint="Puede que la hayas eliminado o que el enlace esté roto."
          />
        )}
      </PhoneShell>
    )
  }

  return (
    <EnvelopesView
      account={account}
      envelopes={(envelopes ?? []).filter((e) => e.accountId === accountId)}
      showBalances={showBalances}
      onBack={onBack}
      onCreate={(input) => createEnvelope.mutateAsync({ accountId, ...input })}
      onAdjust={(input) => adjustEnvelope.mutateAsync(input)}
      onRename={(input) => updateEnvelope.mutateAsync(input)}
      onDelete={(id) => deleteEnvelope.mutateAsync(id)}
    />
  )
}
