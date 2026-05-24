import { useId } from 'react'

interface JarProps {
  fraction: number
  width?: number
  height?: number
  color?: string
  bgColor?: string
}

export function Jar({
  fraction,
  width = 160,
  height = 220,
  color = 'var(--color-accent)',
  bgColor = 'var(--color-accent-bg)',
}: JarProps) {
  const safeFraction = Math.max(0, Math.min(1, fraction))
  const lidH = 16
  const bodyH = height - lidH - 4
  const fillH = safeFraction * (bodyH - 6)
  const clipId = useId().replace(/[:]/g, '')
  const fillY = lidH + 4 + (bodyH - fillH)

  return (
    <svg width={width} height={height} className="block overflow-visible">
      <rect
        x={width * 0.18}
        y={0}
        width={width * 0.64}
        height={lidH}
        rx={3}
        fill="var(--color-surface)"
        stroke="var(--color-ink)"
        strokeWidth={1.25}
      />
      <rect
        x={width * 0.08}
        y={lidH + 4}
        width={width * 0.84}
        height={bodyH}
        rx={14}
        fill="var(--color-surface)"
        stroke="var(--color-ink)"
        strokeWidth={1.25}
      />
      <clipPath id={`jc-${clipId}`}>
        <rect
          x={width * 0.08 + 1.5}
          y={lidH + 5.5}
          width={width * 0.84 - 3}
          height={bodyH - 3}
          rx={13}
        />
      </clipPath>
      <g clipPath={`url(#jc-${clipId})`}>
        <rect x={0} y={fillY} width={width} height={fillH + 12} fill={bgColor} />
        <path
          d={`M 0 ${fillY} Q ${width * 0.25} ${fillY - 4} ${width * 0.5} ${fillY} T ${width} ${fillY} L ${width} ${height} L 0 ${height} Z`}
          fill={color}
          opacity={0.4}
        />
      </g>
      {[0.25, 0.5, 0.75].map((p) => (
        <line
          key={p}
          x1={width * 0.08}
          x2={width * 0.16}
          y1={lidH + 4 + bodyH * (1 - p)}
          y2={lidH + 4 + bodyH * (1 - p)}
          stroke="var(--color-ink-soft)"
          strokeWidth={0.75}
        />
      ))}
    </svg>
  )
}
