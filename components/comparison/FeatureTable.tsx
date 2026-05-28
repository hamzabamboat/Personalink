import type { FeatureRow } from '@/lib/competitor-data'

type Props = {
  competitorName: string
  rows: FeatureRow[]
}

const PL_TINT = 'color-mix(in srgb, #10b981 12%, var(--surface))'
const PL_BORDER = 'color-mix(in srgb, #10b981 32%, var(--line))'
const RIVAL_TINT = 'color-mix(in srgb, #ef4444 10%, var(--surface))'
const RIVAL_BORDER = 'color-mix(in srgb, #ef4444 30%, var(--line))'

export function FeatureTable({ competitorName, rows }: Props) {
  return (
    <div
      style={{
        border: '1px solid var(--line)',
        borderRadius: 'var(--r-lg)',
        background: 'var(--surface)',
        overflow: 'hidden',
        boxShadow: 'var(--sh-1)',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.6fr 1fr 1fr',
          background: 'var(--surface-2)',
          borderBottom: '1px solid var(--line)',
          padding: '14px 18px',
          gap: 12,
          alignItems: 'center',
          fontSize: 12,
          fontWeight: 600,
          fontFamily: 'var(--f-mono)',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          color: 'var(--ink-3)',
        }}
      >
        <span>Feature</span>
        <span style={{ color: 'var(--pl-accent)' }}>PersonaLink</span>
        <span>{competitorName}</span>
      </div>

      {rows.map((row, i) => {
        const plHighlight = row.highlight === 'pl'
        const rivalHighlight = row.highlight === 'competitor'
        return (
          <div
            key={i}
            style={{
              display: 'grid',
              gridTemplateColumns: '1.6fr 1fr 1fr',
              gap: 12,
              padding: '14px 18px',
              borderBottom: i === rows.length - 1 ? 'none' : '1px solid var(--line)',
              alignItems: 'start',
              fontSize: 14,
            }}
          >
            <div style={{ color: 'var(--ink-2)', fontWeight: 500, lineHeight: 1.5 }}>
              {row.label}
              {row.note && (
                <div
                  style={{
                    marginTop: 4,
                    fontSize: 12,
                    color: 'var(--ink-4)',
                    fontWeight: 400,
                    lineHeight: 1.5,
                  }}
                >
                  {row.note}
                </div>
              )}
            </div>
            <div
              style={{
                padding: plHighlight ? '8px 10px' : 0,
                background: plHighlight ? PL_TINT : 'transparent',
                border: plHighlight ? `1px solid ${PL_BORDER}` : 'none',
                borderRadius: plHighlight ? 'var(--r-sm)' : 0,
                color: 'var(--ink)',
                fontWeight: plHighlight ? 600 : 500,
                lineHeight: 1.5,
              }}
            >
              {row.pl}
            </div>
            <div
              style={{
                padding: rivalHighlight ? '8px 10px' : 0,
                background: rivalHighlight ? RIVAL_TINT : 'transparent',
                border: rivalHighlight ? `1px solid ${RIVAL_BORDER}` : 'none',
                borderRadius: rivalHighlight ? 'var(--r-sm)' : 0,
                color: rivalHighlight ? '#b91c1c' : 'var(--ink-3)',
                fontWeight: 500,
                lineHeight: 1.5,
              }}
            >
              {row.competitor}
            </div>
          </div>
        )
      })}
    </div>
  )
}
