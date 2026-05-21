import type { ReactNode } from 'react'

interface AppBarProps {
  title?: ReactNode
  left?: ReactNode
  right?: ReactNode
  sub?: ReactNode
}

export function AppBar({ title, left, right, sub }: AppBarProps) {
  return (
    <div className="px-5 pt-2 pb-3">
      <div className="flex h-8 items-center justify-between">
        <div className="w-16 text-[13px] text-ink-mid">{left}</div>
        <div className="text-[13px] font-medium text-ink">{title}</div>
        <div className="w-16 text-right text-[13px] text-ink-mid">{right}</div>
      </div>
      {sub ? <div className="mt-1.5 text-center text-[12px] text-ink-mid">{sub}</div> : null}
    </div>
  )
}
