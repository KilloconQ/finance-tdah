import type { ReactNode } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { AppBar, Dots, PhoneShell } from '@/components'

export const ONBOARDING_STEPS = 4

interface OnboardingLayoutProps {
  step: number
  children: ReactNode
}

export function OnboardingLayout({ step, children }: OnboardingLayoutProps) {
  const navigate = useNavigate()
  return (
    <PhoneShell variant="narrow">
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
            {step} / {ONBOARDING_STEPS}
          </span>
        }
      />
      <div className="flex flex-1 flex-col overflow-y-auto px-7 pb-6 pt-2">
        <Dots total={ONBOARDING_STEPS} filled={step} size={6} gap={5} />
        {children}
      </div>
    </PhoneShell>
  )
}
