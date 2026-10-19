import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ChevronRight, Plus, Users } from 'lucide-react'
import { Btn, EmptyState, IconButton, Money, PhoneShell, TabBar } from '@/components'
import { Avatar } from '@/features/groups/components/Avatar'
import { Sheet } from '@/features/groups/components/Sheet'
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
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)

  const owed = groups.reduce((n, g) => n + Math.max(g.myBalanceCents, 0), 0)
  const owe = groups.reduce((n, g) => n + Math.max(-g.myBalanceCents, 0), 0)

  const close = () => {
    setCreating(false)
    setName('')
    setError(null)
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    createGroup.mutate(name.trim(), {
      onSuccess: close,
      onError: (err) => setError(err instanceof Error ? err.message : 'No pudimos crear el grupo'),
    })
  }

  return (
    <PhoneShell>
      <div className="flex items-end justify-between gap-3 pb-4 pt-6">
        <h1 className="px-1 text-[34px] font-bold leading-tight tracking-tight text-ink">Grupos</h1>
        <IconButton onClick={() => setCreating(true)} label="Nuevo grupo">
          <Plus size={22} strokeWidth={2.4} className="text-accent-strong" />
        </IconButton>
      </div>

      <div className="max-w-2xl flex-1 space-y-6 pb-4">
        {groups.length === 0 ? (
          <EmptyState
            icon={<Users size={22} strokeWidth={1.8} />}
            title="Aún no tienes grupos"
            hint="Crea uno para dividir gastos y saber quién le debe a quién."
            action={
              <Btn kind="primary" onClick={() => setCreating(true)}>
                Crear grupo
              </Btn>
            }
          />
        ) : (
          <>
            <section className="flex justify-between rounded-2xl border border-line bg-surface p-4">
              <div>
                <div className="text-sm text-ink-mid">Te deben</div>
                <div className="money text-2xl font-bold tracking-tight text-accent-strong">
                  <Money value={owed / 100} weight="semibold" />
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-ink-mid">Debes</div>
                <div className="money text-2xl font-bold tracking-tight text-danger">
                  <Money value={owe / 100} weight="semibold" />
                </div>
              </div>
            </section>

            <section>
              <div className="px-4 pb-2 text-xs font-medium uppercase tracking-wide text-ink-mid">Mis grupos</div>
              <div className="divide-y divide-line-soft overflow-hidden rounded-2xl border border-line bg-surface">
                {groups.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => navigate({ to: '/groups/$id', params: { id: g.id } })}
                    className="wf-tap flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-bg-alt"
                  >
                    <Avatar name={g.name} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-base text-ink">{g.name}</div>
                      <div className="text-sm text-ink-mid">
                        {g.members.length} {g.members.length === 1 ? 'miembro' : 'miembros'}
                      </div>
                    </div>
                    {g.myBalanceCents === 0 ? (
                      <span className="text-sm text-ink-mid">A mano</span>
                    ) : (
                      <div className="text-right">
                        <div
                          className={`text-base font-semibold ${g.myBalanceCents > 0 ? 'text-accent-strong' : 'text-danger'}`}
                        >
                          <Money value={Math.abs(g.myBalanceCents) / 100} weight="semibold" />
                        </div>
                        <div className="text-xs text-ink-mid">{g.myBalanceCents > 0 ? 'te deben' : 'debes'}</div>
                      </div>
                    )}
                    <ChevronRight size={18} strokeWidth={2} className="text-ink-ghost" />
                  </button>
                ))}
              </div>
            </section>
          </>
        )}
      </div>

      {creating ? (
        <Sheet title="Nuevo grupo" onClose={close}>
          <form onSubmit={submit} className="pt-2">
            <label htmlFor="group-name" className="block text-sm font-medium text-ink-mid">
              Nombre
            </label>
            <input
              id="group-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Viaje a la playa"
              className="mt-1.5 w-full rounded-xl border border-line bg-surface px-4 py-3 text-base text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-bg"
            />
            {error ? <div className="mt-3 rounded-xl bg-danger-bg px-3 py-2 text-sm text-danger">{error}</div> : null}
            <Btn kind="primary" type="submit" className="mt-4 w-full" disabled={!name.trim() || createGroup.isPending}>
              Crear grupo
            </Btn>
          </form>
        </Sheet>
      ) : null}
      <TabBar />
    </PhoneShell>
  )
}
