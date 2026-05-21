import type { ReactNode } from 'react'

interface SectionHeaderProps {
  title: string
  action?: ReactNode
}

export function SectionHeader({ title, action }: SectionHeaderProps) {
  return (
    <div className="flex items-baseline justify-between px-5 pb-2">
      <div className="wf-mono text-[11px] font-medium uppercase tracking-[0.08em] text-ink-mid">
        {title}
      </div>
      {action ? <div className="text-[12px] text-ink-mid">{action}</div> : null}
    </div>
  )
}
