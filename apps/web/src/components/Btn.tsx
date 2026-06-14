import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

type BtnKind = 'primary' | 'ghost' | 'plain' | 'danger' | 'accent'

interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  kind?: BtnKind
}

const KIND_CLASS: Record<BtnKind, string> = {
  primary: 'bg-accent text-surface border border-accent shadow-card hover:bg-accent-strong',
  ghost: 'bg-surface text-ink border border-line shadow-card hover:bg-bg-alt',
  plain: 'bg-transparent text-ink-mid border-none',
  danger: 'bg-surface text-danger border border-line shadow-card hover:bg-danger-bg',
  accent: 'bg-accent text-surface border border-accent shadow-card hover:bg-accent-strong',
}

export function Btn({ children, kind = 'ghost', className, ...rest }: BtnProps) {
  return (
    <button
      type="button"
      className={cn(
        'wf-tap rounded-xl px-3.5 py-2.5 text-[13px] font-medium transition-colors',
        KIND_CLASS[kind],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}
