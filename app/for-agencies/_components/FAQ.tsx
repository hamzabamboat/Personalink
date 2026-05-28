const FAQS: { q: string; a: string }[] = [
  {
    q: 'Why no public pricing?',
    a: 'Every agency setup is different. We size the deal to your client count, white-label needs, and support level. You will not pay for things you do not use.',
  },
  {
    q: 'Can clients tell we are using PersonaLink?',
    a: 'No. Full white-label. Your brand on the dashboard, your brand on invoices.',
  },
  {
    q: 'Do you accept international agencies?',
    a: 'Yes. We invoice in USD, EUR, or GBP and accept international cards.',
  },
  {
    q: 'GST invoices?',
    a: 'Yes. GST line items where applicable, ITC-claimable.',
  },
  {
    q: 'Minimum commitment?',
    a: 'Quarterly billing. You can cancel any time before the next quarter.',
  },
  {
    q: 'How fast can we onboard?',
    a: 'First three clients live in 48 hours. We handle the imports.',
  },
  {
    q: 'Can you migrate us from Taplio?',
    a: 'Yes. We map your existing client accounts in one session and rebuild voice profiles from their post history. Most migrations take 2–3 days.',
  },
  {
    q: 'What if a client leaves us?',
    a: 'Full data export, no lock-in. Their posts, drafts, and history are yours.',
  },
  {
    q: 'Do you train our team?',
    a: 'Yes. Included for Tier 2 and above. One live session plus a recorded walkthrough.',
  },
  {
    q: 'What is the typical agency MRR?',
    a: 'Most agencies pay between ₹15K and ₹50K per month, depending on client count and white-label requirements.',
  },
]

export function FAQ() {
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {FAQS.map((f, i) => (
        <details
          key={i}
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--r-md)',
            padding: '14px 18px',
          }}
        >
          <summary
            style={{
              cursor: 'pointer',
              fontSize: 15,
              fontWeight: 500,
              color: 'var(--ink)',
              listStyle: 'none',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
            }}
          >
            {f.q}
            <span style={{ color: 'var(--ink-4)', fontSize: 18, lineHeight: 1 }} aria-hidden>+</span>
          </summary>
          <p style={{ fontSize: 14, color: 'var(--ink-3)', lineHeight: 1.6, margin: '10px 0 0' }}>
            {f.a}
          </p>
        </details>
      ))}
    </div>
  )
}
