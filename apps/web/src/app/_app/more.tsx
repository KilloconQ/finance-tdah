import { createFileRoute, Link } from '@tanstack/react-router'
import { ChevronRight, Flame, Repeat, Settings, type LucideIcon } from 'lucide-react'
import { AppBar, Card, PhoneShell, TabBar } from '@/components'

export const Route = createFileRoute('/_app/more')({
  component: More,
})

const ITEMS: ReadonlyArray<{ to: string; label: string; hint: string; icon: LucideIcon }> = [
  { to: '/subscriptions', label: 'Suscripciones', hint: 'Lo que pagas cada mes o año', icon: Repeat },
  { to: '/challenge', label: 'Retos', hint: 'Tu racha de ahorro', icon: Flame },
  { to: '/settings', label: 'Ajustes', hint: 'Apariencia, recordatorios y cuenta', icon: Settings },
]

function More() {
  return (
    <PhoneShell>
      <AppBar title="Más" />
      <Card className="divide-y divide-line-soft p-0">
        {ITEMS.map(({ to, label, hint, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="flex min-h-16 items-center gap-3 px-4 py-3 transition-colors first:rounded-t-2xl last:rounded-b-2xl hover:bg-bg-alt"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent-bg text-accent-strong">
              <Icon size={20} strokeWidth={2} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-base text-ink">{label}</span>
              <span className="block text-[13px] text-ink-mid">{hint}</span>
            </span>
            <ChevronRight size={18} strokeWidth={2} className="shrink-0 text-ink-soft" />
          </Link>
        ))}
      </Card>
      <div className="flex-1" />
      <TabBar />
    </PhoneShell>
  )
}
