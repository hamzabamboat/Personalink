import { cn } from '@/lib/utils'

interface WordMarkProps {
  /** show the icon logo mark */
  icon?: boolean
  /** show "Persona" + italic serif "Link." wordmark */
  wordmark?: boolean
  iconSize?: number
  /** 'default' = electric blue mark in white chip; 'bare' = mark only, no chip; 'white' = white mark on electric bg */
  variant?: 'default' | 'bare' | 'white'
  className?: string
}

/** PersonaLink brand mark — 6-petal asterisk at 10° italic axis */
function Mark({ size, color = 'currentColor' }: { size: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <g transform="translate(50 50) rotate(10)" fill={color}>
        <path d="M 0 -42 C 4 -28 4 -12 0 0 C -4 -12 -4 -28 0 -42 Z" />
        <path d="M 0 -42 C 4 -28 4 -12 0 0 C -4 -12 -4 -28 0 -42 Z" transform="rotate(60)" />
        <path d="M 0 -42 C 4 -28 4 -12 0 0 C -4 -12 -4 -28 0 -42 Z" transform="rotate(120)" />
        <path d="M 0 -42 C 4 -28 4 -12 0 0 C -4 -12 -4 -28 0 -42 Z" transform="rotate(180)" />
        <path d="M 0 -42 C 4 -28 4 -12 0 0 C -4 -12 -4 -28 0 -42 Z" transform="rotate(240)" />
        <path d="M 0 -42 C 4 -28 4 -12 0 0 C -4 -12 -4 -28 0 -42 Z" transform="rotate(300)" />
      </g>
    </svg>
  )
}

export function WordMark({ icon = true, wordmark = true, iconSize = 34, variant = 'default', className }: WordMarkProps) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      {icon && (
        variant === 'white' ? (
          <span
            className="inline-flex items-center justify-center flex-shrink-0"
            style={{
              width: iconSize,
              height: iconSize,
              borderRadius: 'var(--r-sm)',
              background: 'var(--pl-accent)',
            }}
          >
            <Mark size={Math.round(iconSize * 0.7)} color="#ffffff" />
          </span>
        ) : variant === 'bare' ? (
          <Mark size={iconSize} color="var(--pl-accent)" />
        ) : (
          <span
            className="inline-flex items-center justify-center flex-shrink-0"
            style={{
              width: iconSize,
              height: iconSize,
              borderRadius: 'var(--r-sm)',
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.6), 0 1px 2px rgba(10,16,36,.06), 0 4px 12px -4px rgba(43,77,255,.18)',
            }}
          >
            <Mark size={Math.round(iconSize * 0.7)} color="var(--pl-accent)" />
          </span>
        )
      )}
      {wordmark && (
        <span
          style={{
            fontFamily: 'var(--f-sans)',
            fontWeight: 500,
            fontSize: 17,
            letterSpacing: '-0.025em',
            color: 'var(--ink)',
            lineHeight: 1,
          }}
        >
          Persona
          <em
            style={{
              fontFamily: 'var(--f-display)',
              fontStyle: 'italic',
              fontWeight: 500,
              color: 'var(--pl-accent)',
              marginLeft: 1,
              letterSpacing: '-0.005em',
            }}
          >
            Link.
          </em>
        </span>
      )}
    </span>
  )
}
