import { formatMoney } from '@/lib/format'
import { Jar } from './Jar'

interface JarWithStatsProps {
  fraction: number
  label?: string
  currentCents?: number
  targetCents?: number
  hidden?: boolean
  width?: number
  height?: number
}

export function JarWithStats({
  fraction,
  label,
  currentCents,
  targetCents,
  hidden,
  width,
  height,
}: JarWithStatsProps) {
  const showAmounts = currentCents !== undefined || targetCents !== undefined

  return (
    <div className="inline-flex flex-col items-center">
      <Jar fraction={fraction} width={width} height={height} />
      {label ? <div className="mt-3 text-center text-[12px] text-ink-mid">{label}</div> : null}
      {showAmounts ? (
        <div className="money mt-2 text-sm font-medium text-ink">
          {hidden
            ? '•••• / ••••'
            : `${formatMoney((currentCents ?? 0) / 100)} / ${formatMoney((targetCents ?? 0) / 100)}`}
        </div>
      ) : null}
    </div>
  )
}
