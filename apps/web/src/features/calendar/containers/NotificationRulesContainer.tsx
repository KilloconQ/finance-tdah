import { useQuery } from '@tanstack/react-query'
import type { NotificationRuleDTO } from '@finance-tdah/shared/schemas'
import { notificationRulesQueryOptions, useSaveNotificationRule } from '../api'
import { ALERT_LABEL, DAYS_BEFORE_OPTIONS, daysBeforeLabel, hourLabel } from '../labels'

const HOURS = Array.from({ length: 24 }, (_, h) => h)

/** One row per kind of calendar notification: on or off, how many days before, and at what hour. */
export function NotificationRulesContainer() {
  const { data: rules, isError, isLoading } = useQuery(notificationRulesQueryOptions())
  const save = useSaveNotificationRule()

  if (isLoading) return null
  if (isError || !rules) {
    return <div className="rounded-xl bg-danger-bg px-3 py-2 text-sm text-danger">No pudimos cargar tus avisos del calendario.</div>
  }

  const change = (rule: NotificationRuleDTO, patch: Partial<NotificationRuleDTO>) => save.mutate({ ...rule, ...patch })

  return (
    <div className="flex flex-col gap-3">
      {rules.map((rule) => (
        <fieldset key={rule.kind} className="rounded-xl border border-line bg-surface px-4 py-3">
          <legend className="sr-only">{ALERT_LABEL[rule.kind]}</legend>
          <label className="flex items-center justify-between gap-3 text-sm text-ink">
            {ALERT_LABEL[rule.kind]}
            <input
              type="checkbox"
              checked={rule.enabled}
              onChange={(e) => change(rule, { enabled: e.target.checked })}
              className="h-5 w-5 accent-[var(--color-accent)]"
            />
          </label>
          {rule.enabled ? (
            <div className="mt-2 flex gap-3 text-sm text-ink-mid">
              <label className="flex flex-1 flex-col gap-1">
                Cuándo
                <select
                  value={rule.daysBefore}
                  onChange={(e) => change(rule, { daysBefore: Number(e.target.value) })}
                  className="rounded-lg border border-line bg-bg-alt px-2 py-1.5 text-ink"
                >
                  {(DAYS_BEFORE_OPTIONS.includes(rule.daysBefore) ? DAYS_BEFORE_OPTIONS : [...DAYS_BEFORE_OPTIONS, rule.daysBefore].sort((a, b) => a - b)).map((d) => (
                    <option key={d} value={d}>
                      {daysBeforeLabel(d)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-1 flex-col gap-1">
                A qué hora
                <select
                  value={rule.hour}
                  onChange={(e) => change(rule, { hour: Number(e.target.value) })}
                  className="rounded-lg border border-line bg-bg-alt px-2 py-1.5 text-ink"
                >
                  {HOURS.map((h) => (
                    <option key={h} value={h}>
                      {hourLabel(h)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : null}
        </fieldset>
      ))}
      {save.isError ? <div className="rounded-xl bg-danger-bg px-3 py-2 text-sm text-danger">No pudimos guardar el cambio. Intenta de nuevo.</div> : null}
    </div>
  )
}
