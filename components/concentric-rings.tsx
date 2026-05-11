interface Props {
  size?: number
  opacity?: number
  className?: string
  variant?: 'full' | 'quarter' | 'half'
  color?: 'blue' | 'white'
}

export function ConcentricRings({ size = 320, opacity = 0.12, className, variant = 'full', color = 'blue' }: Props) {
  const stroke = color === 'white' ? 'white' : '#2563eb'
  const rings = [
    { r: size * 0.15, sw: 1 },
    { r: size * 0.25, sw: 0.75 },
    { r: size * 0.35, sw: 1 },
    { r: size * 0.44, sw: 0.5, dash: '4 4' },
    { r: size * 0.5, sw: 0.75 },
  ]
  const cx = variant === 'quarter' ? size : variant === 'half' ? size : size / 2
  const cy = variant === 'quarter' ? size : size / 2
  const w = variant === 'full' ? size : variant === 'half' ? size / 2 : size / 2
  const h = variant === 'full' ? size : size / 2

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className={className}
      style={{ opacity }}
      aria-hidden="true"
    >
      <circle cx={cx} cy={cy} r={size * 0.03} fill={stroke} />
      {rings.map((ring, i) => (
        <circle
          key={i}
          cx={cx}
          cy={cy}
          r={ring.r}
          fill="none"
          stroke={stroke}
          strokeWidth={ring.sw}
          strokeDasharray={ring.dash}
        />
      ))}
    </svg>
  )
}

export function QuarterRings({ size = 280, color = 'blue', className, opacity = 0.10 }: { size?: number; color?: 'blue' | 'white'; className?: string; opacity?: number }) {
  return <ConcentricRings size={size} opacity={opacity} variant="quarter" color={color} className={className} />
}
