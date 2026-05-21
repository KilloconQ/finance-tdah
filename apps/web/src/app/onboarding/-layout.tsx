import type { ReactNode } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { AppBar, Dots, PhoneShell } from '@/components'

interface OnboardingLayoutProps {
  step: number
  total?: number
  children: ReactNode
}

export function OnboardingLayout({ step, total = 5, children }: OnboardingLayoutProps) {
  const navigate = useNavigate()
  return (
    <PhoneShell>
      <AppBar
        left={
          <button
            type="button"
            onClick={() => navigate({ to: '..' })}
            className="wf-tap text-[16px] text-ink"
          >
            ←
          </button>
        }
        right={
          <span className="wf-mono text-[12px] text-ink-mid">
            {step} / {total}
          </span>
        }
      />
      <div className="flex flex-1 flex-col overflow-y-auto px-7 pb-6 pt-2">
        <Dots total={total} filled={step} size={6} gap={5} />
        {children}
      </div>
    </PhoneShell>
  )
}
