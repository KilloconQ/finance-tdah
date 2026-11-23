import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { adminStatsQuery } from '@/lib/queries'

export const Route = createFileRoute('/_app/admin')({ component: Admin })

function Admin() {
  const { data, isPending, isError } = useQuery(adminStatsQuery())
  if (isPending) return <p className="p-6 text-ink-mid">Cargando…</p>
  if (isError) return <p className="p-6 text-ink-mid">No tienes acceso.</p>

  const rows: [string, number | string][] = [
    ['Usuarios', data.users],
    ['En allowlist (gratis)', data.allowlisted],
    ['Suscriptores activos', data.subscribers],
    ['Activos últimos 7 días', data.activeLast7Days],
    ['Gastos últimos 7 días', data.expensesLast7Days],
    ['Onboarding web', data.onboarded.web],
    ['Onboarding iOS', data.onboarded.ios],
  ]
  return (
    <div className="mx-auto w-full max-w-xl p-6">
      <h1 className="text-[22px] font-medium text-ink">Admin</h1>
      <dl className="mt-4 divide-y divide-line">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between py-2.5 text-[14px]">
            <dt className="text-ink-mid">{label}</dt>
            <dd className="wf-mono text-ink">{value}</dd>
          </div>
        ))}
      </dl>
      <h2 className="mt-6 text-[15px] font-medium text-ink">Registros por día (30 días)</h2>
      <ul className="mt-2 text-[13px] text-ink-mid">
        {data.signupsByDay.map((d) => (
          <li key={d.day} className="flex justify-between py-1">
            <span>{d.day}</span>
            <span className="wf-mono">{d.count}</span>
          </li>
        ))}
        {data.signupsByDay.length === 0 && <li>Sin registros.</li>}
      </ul>
    </div>
  )
}
