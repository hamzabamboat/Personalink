const TIERS = [
  { label: 'Tier 1', range: '3 to 5 clients', note: 'Solo studios and growing teams' },
  { label: 'Tier 2', range: '6 to 15 clients', note: 'Mid-size agencies with named seats' },
  { label: 'Tier 3', range: '16+ clients', note: 'White-label, dedicated support, custom SLAs' },
]

export function PricingTiers() {
  return (
    <div>
      <p
        style={{
          fontSize: 'clamp(18px, 2.4vw, 22px)',
          fontWeight: 500,
          color: 'var(--ink)',
          margin: '0 0 24px',
          maxWidth: 560,
          lineHeight: 1.5,
        }}
      >
        We don&apos;t sell a tier. We sell a deal.
      </p>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 14,
          marginBottom: 24,
        }}
      >
        {TIERS.map(t => (
          <div
            key={t.label}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--r-lg)',
              padding: '22px 20px',
            }}
          >
            <div
              style={{
                fontSize: 11.5,
                fontFamily: 'var(--f-mono)',
                fontWeight: 500,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: 'var(--ink-4)',
                marginBottom: 6,
              }}
            >
              {t.label}
            </div>
            <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink)', marginBottom: 8 }}>
              {t.range}
            </div>
            <div style={{ fontSize: 13.5, color: 'var(--ink-3)', lineHeight: 1.55 }}>{t.note}</div>
          </div>
        ))}
      </div>
      <p style={{ fontSize: 14, color: 'var(--ink-3)', lineHeight: 1.6, maxWidth: 640, margin: 0 }}>
        Final pricing depends on your white-label requirements, support level, and onboarding needs.
        Most agencies pay between ₹15K and ₹50K per month.
      </p>
    </div>
  )
}
