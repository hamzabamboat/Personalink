type Row = { feature: string; personalink: string; taplio: string; hiring: string }

const ROWS: Row[] = [
  {
    feature: 'Per-client voice isolation',
    personalink: 'Yes — 6-dim fingerprint per client',
    taplio: 'No — shared workspace voice',
    hiring: 'Yes — but variable by writer',
  },
  {
    feature: 'White-label dashboard + invoices',
    personalink: 'Yes — your brand, your colours',
    taplio: 'No',
    hiring: 'N/A',
  },
  {
    feature: 'INR billing with GST',
    personalink: 'Yes — INR invoices, GST line items',
    taplio: 'USD only',
    hiring: 'Yes',
  },
  {
    feature: 'Bulk operations across clients',
    personalink: 'Yes — one queue, every client',
    taplio: 'Limited — switch accounts',
    hiring: 'No — one writer per client',
  },
  {
    feature: 'Support',
    personalink: 'Direct line to founder, <24h reply',
    taplio: 'Email support, days',
    hiring: 'You manage the people',
  },
  {
    feature: 'Pricing for 8 clients',
    personalink: 'Custom (typical: ₹15K–₹30K/month)',
    taplio: '~$249/month + per-seat',
    hiring: '₹1L+/month per writer',
  },
]

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '12px 14px',
  fontSize: 12,
  fontFamily: 'var(--f-mono)',
  fontWeight: 500,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  color: 'var(--ink-4)',
}

const tdStyle: React.CSSProperties = {
  padding: '14px',
  fontSize: 13.5,
  color: 'var(--ink-2)',
  verticalAlign: 'top',
  lineHeight: 1.5,
}

export function ComparisonTable() {
  return (
    <div style={{ overflowX: 'auto', marginTop: 28 }}>
      <table
        style={{
          width: '100%',
          minWidth: 640,
          borderCollapse: 'collapse',
          fontSize: 14,
          color: 'var(--ink-2)',
        }}
      >
        <thead>
          <tr style={{ borderBottom: '1px solid var(--line)' }}>
            <th style={thStyle}></th>
            <th style={{ ...thStyle, color: 'var(--ink)', fontWeight: 600 }}>PersonaLink Agency</th>
            <th style={thStyle}>Taplio team plan</th>
            <th style={thStyle}>Hiring writers</th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map(r => (
            <tr key={r.feature} style={{ borderBottom: '1px solid var(--line)' }}>
              <td style={{ ...tdStyle, fontWeight: 500, color: 'var(--ink)' }}>{r.feature}</td>
              <td style={{ ...tdStyle, background: 'color-mix(in srgb, var(--pl-accent) 6%, transparent)' }}>{r.personalink}</td>
              <td style={tdStyle}>{r.taplio}</td>
              <td style={tdStyle}>{r.hiring}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p style={{ fontSize: 12, color: 'var(--ink-4)', marginTop: 12 }}>
        Pricing comparisons reflect public list prices as of 2026. Hiring cost is a mid-market full-time writer in India.
      </p>
    </div>
  )
}
