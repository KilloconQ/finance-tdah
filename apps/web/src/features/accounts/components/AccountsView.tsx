import type { FinancialAccountDTO } from '@finance-tdah/shared/schemas'
import { AppBar, BigNumber, PhoneShell, SectionHeader, TabBar } from '@/components'
import { formatMoney } from '@/lib/format'

const ACCOUNT_EMOJI: Record<string, string> = {
  debito: '🏦',
  credito: '💳',
  efectivo: '💵',
  wallet: '📱',
  ahorro: '🐷',
}

interface AccountsViewProps {
  accounts: FinancialAccountDTO[]
  goalsTotalCents: number
  liquidCents: number
  debtCents: number
  netWorthCents: number
  showBalances: boolean
  detailed: boolean
  onBack: () => void
  onAddAccount: () => void
}

export function AccountsView({
  accounts,
  goalsTotalCents,
  liquidCents,
  debtCents,
  netWorthCents,
  showBalances,
  detailed,
  onBack,
  onAddAccount,
}: AccountsViewProps) {
  const positive = accounts.filter((a) => a.balanceCents >= 0)
  const debt = accounts.filter((a) => a.balanceCents < 0)

  // The bar splits total assets into the free slice and the jar-earmarked slice
  // (both already part of liquid), then debt — so nothing is counted twice.
  const freeWeight = Math.max(0, liquidCents - goalsTotalCents)
  const totalWeight = Math.max(1, freeWeight + goalsTotalCents + debtCents)

  return (
    <PhoneShell>
      <AppBar
        title="Cuánto tienes"
        left={
          <button type="button" onClick={onBack} className="wf-tap text-[16px] text-ink">
            ←
          </button>
        }
        right={
          <button
            type="button"
            onClick={onAddAccount}
            className="wf-tap text-[20px] text-ink-mid"
            aria-label="Agregar cuenta"
          >
            +
          </button>
        }
      />

      <div className="flex flex-1 flex-col overflow-y-auto px-6 pb-4">
        <div className="pt-1 text-center">
          <div className="wf-mono text-[11px] uppercase tracking-[0.08em] text-ink-mid">
            Tu plata realmente disponible
          </div>
          <BigNumber value={netWorthCents / 100} hidden={!showBalances} size="md" />
          <div className="-mt-3 text-[12px] leading-relaxed text-ink-mid">
            {showBalances ? (
              <>
                tienes <span className="wf-mono text-ink">{formatMoney(liquidCents / 100)}</span> ·
                debes <span className="wf-mono text-danger">{formatMoney(debtCents / 100)}</span>
              </>
            ) : (
              '•••• · ••••'
            )}
          </div>
        </div>

        <div className="mt-1 rounded-xl border border-line bg-surface p-3.5">
          <div className="flex h-3.5 overflow-hidden rounded-md bg-line-soft">
            <div className="bg-ink" style={{ flex: freeWeight / totalWeight }} />
            <div className="bg-accent" style={{ flex: goalsTotalCents / totalWeight }} />
            <div className="bg-danger" style={{ flex: debtCents / totalWeight, opacity: 0.6 }} />
          </div>
          <div className="mt-2.5 flex flex-wrap gap-3 text-[11px] text-ink-mid">
            <LegendDot color="ink" label="libre" />
            <LegendDot color="accent" label="frascos" />
            <LegendDot color="danger" label="deuda" />
          </div>
        </div>

        {detailed ? (
          <div className="mt-5">
            <SectionHeader title="A favor" />
            <div className="divide-y divide-line-soft rounded-xl border border-line bg-surface">
              {positive.map((a) => (
                <div key={a.id} className="flex items-center gap-3 px-3.5 py-3">
                  <span className="text-[18px]">{ACCOUNT_EMOJI[a.type] ?? '·'}</span>
                  <span className="flex-1 text-[13px] text-ink">{a.name}</span>
                  <span className="wf-mono text-[13px] text-ink">
                    {formatMoney(a.balanceCents / 100, !showBalances)}
                  </span>
                </div>
              ))}
              <div className="flex items-center gap-3 px-3.5 py-3">
                <span className="text-[18px]">🐷</span>
                <span className="flex-1 text-[13px] text-ink">Frascos guardados</span>
                <span className="wf-mono text-[13px] text-ink">
                  {formatMoney(goalsTotalCents / 100, !showBalances)}
                </span>
              </div>
            </div>

            <SectionHeader title="Por pagar" />
            <div className="divide-y divide-line-soft rounded-xl border border-line bg-surface">
              {debt.map((a) => (
                <div key={a.id} className="flex items-center gap-3 px-3.5 py-3">
                  <span className="text-[18px]">💳</span>
                  <div className="flex-1">
                    <div className="text-[13px] text-ink">{a.name}</div>
                    <div className="mt-0.5 text-[11px] text-ink-mid">{a.institution}</div>
                  </div>
                  <span className="wf-mono text-[13px] text-danger">
                    {formatMoney(Math.abs(a.balanceCents) / 100, !showBalances)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <TabBar />
    </PhoneShell>
  )
}

interface LegendDotProps {
  color: 'ink' | 'accent' | 'danger'
  label: string
}

function LegendDot({ color, label }: LegendDotProps) {
  const cls = {
    ink: 'bg-ink',
    accent: 'bg-accent',
    danger: 'bg-danger opacity-60',
  }[color]
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-block h-2 w-2 rounded-[2px] ${cls}`} aria-hidden />
      {label}
    </span>
  )
}
