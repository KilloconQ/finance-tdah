import type { ReactNode } from 'react'

interface SectionHeaderProps {
  title: string
  action?: ReactNode
}

export function SectionHeader({ title, action }: SectionHeaderProps) {
  return (
    <div className="flex items-baseline justify-between pb-2">
      <div className="text-sm font-medium text-ink-mid">{title}</div>
      {action ? <div className="text-sm text-ink-mid">{action}</div> : null}
    </div>
  )
}
