import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Users } from 'lucide-react'
import { AppBar, Btn, Card, EmptyState, PhoneShell, TabBar } from '@/components'
import { groupsQueryOptions, useCreateGroup } from '@/features/groups'
import { queryClient } from '@/lib/query-client'

export const Route = createFileRoute('/_app/groups/')({
  loader: () => queryClient.ensureQueryData(groupsQueryOptions()),
  component: Groups,
})

function Groups() {
  const navigate = useNavigate()
  const { data: groups = [] } = useQuery(groupsQueryOptions())
  const createGroup = useCreateGroup()
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    createGroup.mutate(name.trim(), {
      onSuccess: () => setName(''),
      onError: (err) => setError(err instanceof Error ? err.message : 'No pudimos crear el grupo'),
    })
  }

  return (
    <PhoneShell>
      <AppBar title="Gastos compartidos" />
      <div className="max-w-2xl flex-1 space-y-6 pb-4">
        {groups.length === 0 ? (
          <EmptyState
            icon={<Users size={22} strokeWidth={1.8} />}
            title="Aún no tienes grupos"
            hint="Crea uno para dividir gastos y saber quién le debe a quién."
          />
        ) : (
          <div className="space-y-2">
            {groups.map((g) => (
              <button
                key={g.id}
                type="button"
                className="wf-tap block w-full text-left"
                onClick={() => navigate({ to: '/groups/$id', params: { id: g.id } })}
              >
                <Card>
                  <div className="text-sm font-medium text-ink">{g.name}</div>
                  <div className="mt-0.5 text-xs text-ink-mid">{g.members.length} {g.members.length === 1 ? 'miembro' : 'miembros'}</div>
                </Card>
              </button>
            ))}
          </div>
        )}

        <form onSubmit={submit}>
          <label htmlFor="group-name" className="block text-sm font-medium text-ink-mid">
            Nuevo grupo
          </label>
          <input
            id="group-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Viaje a la playa"
            className="mt-1.5 w-full rounded-xl border border-line bg-surface px-4 py-3 text-base text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-bg"
          />
          {error ? <div className="mt-2 rounded-xl bg-danger-bg px-3 py-2 text-sm text-danger">{error}</div> : null}
          <Btn kind="primary" type="submit" className="mt-3 w-full" disabled={!name.trim() || createGroup.isPending}>
            Crear grupo
          </Btn>
        </form>
      </div>
      <TabBar />
    </PhoneShell>
  )
}
