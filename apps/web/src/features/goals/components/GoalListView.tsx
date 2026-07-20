import type { GoalDTO } from '@finance-tdah/shared/schemas'
import { jarProgress } from '@finance-tdah/shared/domain'
import { Plus, Target } from 'lucide-react'
import {
  AppBar,
  Btn,
  Card,
  EmptyState,
  IconButton,
  Money,
  PhoneShell,
  Skeleton,
  TabBar,
} from '@/components'
import { Jar } from './Jar'

interface GoalListViewProps {
  goals: GoalDTO[]
  totalCents: number
  showBalances: boolean
  isLoading: boolean
  onAddNew: () => void
  onSelectGoal: (id: string) => void
}

export function GoalListView({
  goals,
  totalCents,
  showBalances,
  isLoading,
  onAddNew,
  onSelectGoal,
}: GoalListViewProps) {
  return (
    <PhoneShell>
      <AppBar
        title="Frascos"
        right={
          <IconButton onClick={onAddNew} label="Nueva meta">
            <Plus size={20} strokeWidth={2} />
          </IconButton>
        }
      />

      {isLoading ? (
        <GoalListSkeleton />
      ) : goals.length === 0 ? (
        <EmptyState
          className="flex-1"
          icon={<Target size={22} strokeWidth={1.8} />}
          title="Aún no tienes frascos"
          hint="Crea tu primer frasco y empieza a guardar para lo que te importa."
          action={
            <Btn kind="primary" onClick={onAddNew}>
              Crear frasco
            </Btn>
          }
        />
      ) : (
        <div className="flex-1 pb-4">
          <div className="pb-4">
            <div className="money text-3xl font-semibold tracking-tight text-ink">
              {showBalances ? <Money value={totalCents / 100} weight="semibold" /> : '••••'}
            </div>
            <div className="mt-1 text-sm text-ink-mid">
              guardado en {goals.length} {goals.length === 1 ? 'frasco' : 'frascos'}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {goals.map((g) => {
              const progress = jarProgress({
                currentCents: g.currentCents,
                targetCents: g.targetCents,
              })
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => onSelectGoal(g.id)}
                  className="wf-tap text-left"
                >
                  <Card className="flex h-full items-center gap-4 transition-colors hover:bg-bg-alt">
                    <div className="shrink-0">
                      <Jar fraction={progress.fraction} width={64} height={84} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-base font-medium text-ink">
                        {g.emoji} {g.name}
                      </div>
                      <div className="mt-1 money text-sm text-ink">
                        {showBalances ? (
                          <>
                            <Money value={g.currentCents / 100} weight="semibold" />
                            <span className="text-ink-mid">
                              {' '}
                              / <Money value={g.targetCents / 100} className="text-ink-mid" />
                            </span>
                          </>
                        ) : (
                          '•••• / ••••'
                        )}
                      </div>
                      <div className="mt-1 text-xs font-medium text-accent-strong">
                        {Math.round(progress.percent)}%
                      </div>
                    </div>
                  </Card>
                </button>
              )
            })}
          </div>
        </div>
      )}

      <TabBar />
    </PhoneShell>
  )
}

function GoalListSkeleton() {
  return (
    <div className="flex-1 pb-4">
      <div className="pb-4">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="mt-2 h-4 w-32" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-4"
          >
            <Skeleton className="h-20 w-16 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-3 w-10" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
