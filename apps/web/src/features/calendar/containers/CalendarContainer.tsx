import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import type { CalendarEventKind } from '@finance-tdah/shared/domain'
import type { CalendarEventDTO, IncomeDTO } from '@finance-tdah/shared/schemas'
import { AppBar, Btn, Card, EmptyState, IconButton, Money, PhoneShell, Skeleton, TabBar } from '@/components'
import { cn } from '@/lib/cn'
import { todayLocalISO } from '@/lib/format'
import { useTweaks } from '@/lib/use-tweaks'
import { calendarQueryOptions, incomesQueryOptions } from '../api'
import { FREQUENCY_LABEL, KIND_DOT, KIND_LABEL } from '../labels'
import { monthBounds, monthLabel, monthOf, shiftMonth } from '../month'
import { IncomeSheet } from './IncomeSheet'

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
const pad = (n: number) => String(n).padStart(2, '0')

export function CalendarContainer() {
  const { showBalances } = useTweaks()
  const [ym, setYm] = useState(() => monthOf(todayLocalISO()))
  const [selected, setSelected] = useState<string | null>(null)
  const [editing, setEditing] = useState<'new' | IncomeDTO | null>(null)

  const { from, to, leadingBlanks, days } = monthBounds(ym.year, ym.month)
  const calendar = useQuery(calendarQueryOptions(from, to))
  const { data: incomes = [] } = useQuery(incomesQueryOptions())

  const today = calendar.data?.today ?? todayLocalISO()
  const events = calendar.data?.events ?? []
  const byDate = new Map<string, CalendarEventDTO[]>()
  for (const e of events) byDate.set(e.date, [...(byDate.get(e.date) ?? []), e])
  const day = selected && selected >= from && selected <= to ? selected : today >= from && today <= to ? today : from

  const move = (delta: number) => {
    setYm(shiftMonth(ym, delta))
    setSelected(null)
  }

  return (
    <PhoneShell>
      <AppBar
        title="Calendario"
        right={
          <IconButton onClick={() => setEditing('new')} label="Nuevo ingreso">
            <Plus size={20} strokeWidth={2} />
          </IconButton>
        }
      />

      <div className="flex-1 pb-4">
        <div className="max-w-2xl space-y-6">
          <section>
            <div className="flex items-center justify-between pb-2">
              <IconButton onClick={() => move(-1)} label="Mes anterior">
                <ChevronLeft size={20} strokeWidth={2} />
              </IconButton>
              <h2 className="text-base font-semibold capitalize text-ink">{monthLabel(ym)}</h2>
              <IconButton onClick={() => move(1)} label="Mes siguiente">
                <ChevronRight size={20} strokeWidth={2} />
              </IconButton>
            </div>

            {calendar.isError ? (
              <div className="rounded-xl bg-danger-bg px-3 py-2 text-sm text-danger">No pudimos cargar el calendario. Intenta de nuevo.</div>
            ) : calendar.isLoading ? (
              <Skeleton className="h-64 w-full rounded-2xl" />
            ) : (
              <Card padded={false} className="p-2">
                <div className="grid grid-cols-7 text-center text-xs font-medium text-ink-soft" aria-hidden>
                  {WEEKDAYS.map((d, i) => (
                    <div key={i} className="py-1">
                      {d}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7">
                  {Array.from({ length: leadingBlanks }).map((_, i) => (
                    <div key={`b${i}`} />
                  ))}
                  {Array.from({ length: days }, (_, i) => {
                    const date = `${ym.year}-${pad(ym.month)}-${pad(i + 1)}`
                    const kinds = [...new Set((byDate.get(date) ?? []).map((e) => e.kind))]
                    return (
                      <button
                        key={date}
                        type="button"
                        onClick={() => setSelected(date)}
                        aria-pressed={date === day}
                        aria-label={`${i + 1}${kinds.length ? `, ${kinds.map((k) => KIND_LABEL[k]).join(', ')}` : ''}`}
                        className={cn(
                          'wf-tap flex h-12 flex-col items-center justify-center gap-1 rounded-xl text-sm',
                          date === day ? 'bg-accent text-surface' : 'text-ink hover:bg-bg-alt',
                          date === today && date !== day && 'font-semibold text-accent-strong',
                        )}
                      >
                        <span>{i + 1}</span>
                        <span className="flex h-1.5 gap-0.5" aria-hidden>
                          {kinds.map((k) => (
                            <span key={k} className={cn('h-1.5 w-1.5 rounded-full', KIND_DOT[k])} />
                          ))}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </Card>
            )}

            <Legend />
          </section>

          <DayEvents date={day} events={byDate.get(day) ?? []} hidden={!showBalances} />

          <section>
            <div className="pb-2 text-sm font-medium text-ink-mid">Tus ingresos · {incomes.length}</div>
            {incomes.length === 0 ? (
              <EmptyState
                icon={<CalendarDays size={22} strokeWidth={1.8} />}
                title="Aún no registras ingresos"
                hint="Agrega tu nómina o tus cobros para verlos en el calendario."
                action={
                  <Btn kind="primary" onClick={() => setEditing('new')}>
                    Agregar ingreso
                  </Btn>
                }
              />
            ) : (
              <div className="divide-y divide-line-soft overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
                {incomes.map((income) => (
                  <button
                    key={income.id}
                    type="button"
                    onClick={() => setEditing(income)}
                    className="wf-tap flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-bg-alt"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-ink">{income.name}</div>
                      <div className="mt-0.5 text-xs text-ink-mid">{FREQUENCY_LABEL[income.frequency]}</div>
                    </div>
                    {income.amountCents !== null ? (
                      <Money value={income.amountCents / 100} hidden={!showBalances} className="text-sm text-ink" />
                    ) : null}
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {editing ? <IncomeSheet income={editing === 'new' ? null : editing} onClose={() => setEditing(null)} /> : null}
      <TabBar />
    </PhoneShell>
  )
}

function Legend() {
  const kinds: CalendarEventKind[] = ['card_payment', 'subscription', 'income']
  return (
    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-mid">
      {kinds.map((k) => (
        <span key={k} className="inline-flex items-center gap-1.5">
          <span className={cn('h-2 w-2 rounded-full', KIND_DOT[k])} aria-hidden />
          {KIND_LABEL[k]}
        </span>
      ))}
    </div>
  )
}

function DayEvents({ date, events, hidden }: { date: string; events: CalendarEventDTO[]; hidden: boolean }) {
  const title = new Date(`${date}T00:00:00Z`).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })
  return (
    <section>
      <div className="pb-2 text-sm font-medium capitalize text-ink-mid">{title}</div>
      {events.length === 0 ? (
        <p className="text-sm text-ink-mid">Nada este día.</p>
      ) : (
        <div className="divide-y divide-line-soft overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
          {events.map((e) => (
            <div key={`${e.kind}-${e.sourceId}`} className="flex items-center gap-3 px-4 py-3">
              <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', KIND_DOT[e.kind])} aria-hidden />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-ink">{e.title}</div>
                <div className="mt-0.5 text-xs text-ink-mid">{KIND_LABEL[e.kind]}</div>
              </div>
              {e.amountCents !== null ? (
                <Money value={e.amountCents / 100} hidden={hidden} className={cn('text-sm', e.kind === 'income' ? 'text-good' : 'text-ink')} />
              ) : null}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
