import type { Metadata } from 'next'
import Link from 'next/link'
import { LandingShell } from '@/components/landing/LandingShell'
import { getUsdInrRate, inrFromUsd } from '@/lib/fx'
import { inr } from '@/lib/competitor-data'

export const revalidate = 604800

const URL = 'https://personalink.in/cheap-linkedin-ai-tool-india'

export const metadata: Metadata = {
  title: 'Cheap AI LinkedIn Tool India — From ₹999 | PersonaLink',
  description:
    'The affordable AI LinkedIn tool for India: Starter ₹999/month, a free tier, INR billing and GST invoices. Most rivals bill in USD above ₹1,250. See why ₹999 wins.',
  keywords: [
    'cheap AI LinkedIn tool India',
    'AI LinkedIn automation tool under 1000 INR',
    'affordable LinkedIn AI tool India',
    'cheapest LinkedIn AI tool India',
    'LinkedIn AI tool INR pricing',
    'free LinkedIn AI tool India',
  ],
  alternates: { canonical: URL },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: URL,
    siteName: 'PersonaLink',
    title: 'Cheap AI LinkedIn Tool India — From ₹999/month | PersonaLink',
    description:
      'An affordable AI LinkedIn tool built for India: Starter ₹999/mo, free tier, INR billing, GST invoices. The only major India-built tool under ₹1,000.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Cheap AI LinkedIn tool India — from ₹999' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cheap AI LinkedIn Tool India — From ₹999 | PersonaLink',
    description: 'Affordable AI LinkedIn tool for India: ₹999/mo Starter, free tier, INR billing, GST invoices.',
    images: ['/og-image.png'],
  },
}

// PersonaLink plans (real pricing). Competitor USD figures are public list prices,
// converted at the current rate (refreshed weekly) for an illustrative "what you'd actually pay" comparison.
const PLANS = [
  { name: 'Free', price: '₹0', detail: '3 posts / month · no card', highlight: false },
  { name: 'Starter', price: '₹999', detail: '12 posts / month', highlight: true },
  { name: 'Standard', price: '₹2,499', detail: '22 posts / month', highlight: false },
  { name: 'Pro', price: '₹4,999', detail: '50 posts / month', highlight: false },
  { name: 'Agency', price: 'Custom', detail: 'Multi-client, white-label', highlight: false },
]

const FAQS = [
  {
    q: 'Is there an AI LinkedIn tool under ₹1,000 a month?',
    a: 'Yes. PersonaLink Starter is ₹999/month, billed in INR with a GST invoice. It is the only major India-built LinkedIn AI tool priced under ₹1,000 — most alternatives bill in USD, which works out above ₹1,250 once you add forex and lost GST credit.',
  },
  {
    q: 'Is there a free AI LinkedIn tool for India?',
    a: 'Yes — PersonaLink has a free tier: 3 posts a month, one voice fingerprint, no card required. You can also analyse your writing voice for free at the voice analyzer with no signup.',
  },
  {
    q: 'Why are USD-billed LinkedIn tools more expensive for Indians?',
    a: 'Three hidden costs: Indian cards typically lose 2–4% on international (forex) transactions, USD tools cannot give you a GST invoice so you lose the 18% input tax credit your business could otherwise claim, and international cards more often trip 2FA failures. A $39 tool is closer to ₹3,400 effective — not ₹3,276.',
  },
  {
    q: 'Do I get a GST invoice?',
    a: 'Every PersonaLink invoice carries our GSTIN and your registered business name, so you can claim it as a deductible business expense and recover 18% as input tax credit.',
  },
  {
    q: 'Can I pay with UPI?',
    a: 'Yes. Payments run through Razorpay with UPI and cards supported — no international card required.',
  },
  {
    q: 'Does the cheap plan still write in my voice?',
    a: 'Yes. Even on the ₹999 Starter plan you get the full 6-dimension voice fingerprint, the Anti-AI humanizer, auto-publishing, and Hinglish support. Cheaper here does not mean a stripped-down product.',
  },
]

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Product',
      name: 'PersonaLink — AI LinkedIn Tool for India',
      description:
        'Affordable AI LinkedIn tool for India. Free tier plus paid plans from ₹999/month, billed in INR with GST invoices and UPI support.',
      brand: { '@type': 'Brand', name: 'PersonaLink' },
      url: URL,
      offers: { '@type': 'AggregateOffer', lowPrice: '999', highPrice: '4999', priceCurrency: 'INR', offerCount: 3, availability: 'https://schema.org/InStock' },
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://personalink.in' },
        { '@type': 'ListItem', position: 2, name: 'Cheap AI LinkedIn Tool India', item: URL },
      ],
    },
    {
      '@type': 'FAQPage',
      mainEntity: FAQS.map(({ q, a }) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
    },
  ],
}

const wrap = { maxWidth: 880, margin: '0 auto', padding: '0 clamp(16px,4vw,32px)' } as const
const eyebrow = { fontFamily: 'var(--f-mono)', fontSize: 12, letterSpacing: '0.06em', color: 'var(--pl-accent)', textTransform: 'uppercase' as const, marginBottom: 14 }
const h2 = { fontFamily: 'var(--f-sans)', fontWeight: 700, fontSize: 'clamp(22px,3.2vw,32px)', letterSpacing: '-0.03em', color: 'var(--ink)', margin: '0 0 14px' }
const p = { fontSize: 16, lineHeight: 1.7, color: 'var(--ink-3)', margin: '0 0 16px' }
const section = { padding: 'clamp(36px,6vw,56px) 0', borderTop: '1px solid var(--line)' }

export default async function CheapLinkedinAiToolIndiaPage() {
  const rate = await getUsdInrRate()
  const RIVALS = [
    ['PersonaLink Starter', '₹999 / mo', 'INR · GST invoice · UPI'],
    [`Supergrow (Solo, $19)`, `≈ ${inr(inrFromUsd(19, rate))} / mo`, 'USD · + forex · no GST credit'],
    [`Taplio (Standard, $39)`, `≈ ${inr(inrFromUsd(39, rate))} / mo`, 'USD · + forex · no GST credit'],
    [`Kleo (lifetime, $99)`, `≈ ${inr(inrFromUsd(99, rate))} once`, 'USD · static, no auto-publish'],
  ]
  return (
    <LandingShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Hero */}
      <section style={{ ...wrap, padding: 'clamp(48px,8vw,88px) clamp(16px,4vw,32px) clamp(24px,4vw,40px)' }}>
        <div style={eyebrow}>AI LinkedIn tool for India · from ₹999</div>
        <h1 style={{ fontFamily: 'var(--f-sans)', fontWeight: 700, fontSize: 'clamp(30px,5.5vw,52px)', letterSpacing: '-0.04em', lineHeight: 1.08, color: 'var(--ink)', margin: '0 0 18px' }}>
          A cheap AI LinkedIn tool built for India — from ₹999/month
        </h1>
        <p style={{ ...p, fontSize: 18, maxWidth: 680 }}>
          Most LinkedIn AI tools bill in dollars. PersonaLink bills in rupees, gives you a GST invoice, and starts at
          <strong> ₹999/month</strong> — with a free tier that never expires.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 8 }}>
          <Link href="/voice-analyzer" style={{ background: 'var(--ink)', color: 'var(--bg)', padding: '13px 22px', borderRadius: 'var(--r-md)', fontWeight: 600, fontSize: 15, textDecoration: 'none' }}>Try it free — no card</Link>
          <Link href="/pricing" style={{ background: 'transparent', color: 'var(--ink)', padding: '13px 22px', borderRadius: 'var(--r-md)', fontWeight: 600, fontSize: 15, textDecoration: 'none', border: '1px solid var(--line)' }}>See all plans</Link>
        </div>
      </section>

      {/* Why USD isn't cheap */}
      <section style={{ background: 'var(--surface-2)' }}>
        <div style={{ ...wrap, ...section }}>
          <div style={eyebrow}>The hidden cost</div>
          <h2 style={h2}>Why most “cheap” LinkedIn tools aren’t cheap in India</h2>
          <p style={p}>
            A $19 or $39 sticker price hides three India taxes. Indian cards typically lose <strong>2–4% on forex</strong>;
            USD tools can’t issue a GST invoice, so you forfeit the <strong>18% input tax credit</strong> your business
            could claim; and international charges trip 2FA failures more often. The cheapest dollar price is rarely the
            cheapest real cost.
          </p>
        </div>
      </section>

      {/* Pricing table */}
      <section style={{ ...wrap, ...section }}>
        <div style={eyebrow}>Plain rupees</div>
        <h2 style={h2}>PersonaLink pricing, in INR</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12, marginTop: 8 }}>
          {PLANS.map((plan) => (
            <div key={plan.name} style={{ background: plan.highlight ? 'var(--pl-accent-soft)' : 'var(--surface)', border: `1px solid ${plan.highlight ? 'var(--pl-accent)' : 'var(--line)'}`, borderRadius: 'var(--r-lg)', padding: 18 }}>
              <div style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 6 }}>{plan.name}</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.03em' }}>{plan.price}</div>
              <div style={{ fontSize: 12.5, color: 'var(--ink-4)', marginTop: 4 }}>{plan.detail}</div>
            </div>
          ))}
        </div>
        <p style={{ ...p, marginTop: 18, fontSize: 14, color: 'var(--ink-4)' }}>Annual billing saves ~25%. Agency plans are custom-priced for multi-client, white-label use.</p>
      </section>

      {/* Comparison */}
      <section style={{ background: 'var(--surface-2)' }}>
        <div style={{ ...wrap, ...section }}>
          <div style={eyebrow}>What you’d pay elsewhere</div>
          <h2 style={h2}>The only major India-built tool under ₹1,000</h2>
          <div style={{ overflow: 'hidden', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', background: 'var(--surface)' }}>
            {RIVALS.map(([name, price, note], i) => (
              <div key={name} style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1.4fr', gap: 8, padding: '13px 16px', borderTop: i === 0 ? 'none' : '1px solid var(--line)', background: i === 0 ? 'var(--pl-accent-soft)' : 'transparent', alignItems: 'center' }}>
                <span style={{ fontSize: 14, fontWeight: i === 0 ? 700 : 500, color: 'var(--ink)' }}>{name}</span>
                <span style={{ fontFamily: 'var(--f-mono)', fontSize: 13.5, color: 'var(--ink-2)' }}>{price}</span>
                <span style={{ fontSize: 12.5, color: 'var(--ink-4)' }}>{note}</span>
              </div>
            ))}
          </div>
          <p style={{ ...p, marginTop: 14, fontSize: 13.5, color: 'var(--ink-4)' }}>
            Competitor figures are public USD list prices converted at the current rate, refreshed weekly, before forex and GST. For the full breakdown, read{' '}
            <Link href="/blog/cheapest-ai-linkedin-tools-india" style={{ color: 'var(--pl-accent)' }}>the cheapest AI LinkedIn tools in India compared</Link>.
          </p>
        </div>
      </section>

      {/* Cheap ≠ basic */}
      <section style={{ ...wrap, ...section }}>
        <h2 style={h2}>Cheap doesn’t mean basic</h2>
        <p style={p}>Even on the ₹999 Starter plan you get the full product:</p>
        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 10 }}>
          {['6-dimension voice fingerprint', 'Anti-AI humanizer', 'Auto-publish on schedule', 'Hinglish posts', 'GST invoice + UPI', 'Voice notes → post'].map((f) => (
            <li key={f} style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 14.5, color: 'var(--ink-2)' }}>
              <span style={{ color: 'var(--pl-accent)', fontWeight: 700 }}>✓</span>{f}
            </li>
          ))}
        </ul>
        <div style={{ marginTop: 24 }}>
          <Link href="/ai-linkedin-automation-tool" style={{ color: 'var(--pl-accent)', fontSize: 15 }}>See how the automation works →</Link>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ background: 'var(--surface-2)' }}>
        <div style={{ ...wrap, ...section }}>
          <h2 style={h2}>FAQ</h2>
          <div style={{ marginTop: 8 }}>
            {FAQS.map((f) => (
              <details key={f.q} style={{ borderBottom: '1px solid var(--line)' }}>
                <summary style={{ padding: '16px 0', cursor: 'pointer', fontWeight: 600, fontSize: 15.5, color: 'var(--ink)', listStyle: 'none' }}>{f.q}</summary>
                <div style={{ paddingBottom: 16, fontSize: 14.5, lineHeight: 1.7, color: 'var(--ink-4)' }}>{f.a}</div>
              </details>
            ))}
          </div>
          <div style={{ marginTop: 28 }}>
            <Link href="/voice-analyzer" style={{ background: 'var(--ink)', color: 'var(--bg)', padding: '13px 22px', borderRadius: 'var(--r-md)', fontWeight: 600, fontSize: 15, textDecoration: 'none' }}>Start free — 3 posts, no card</Link>
          </div>
        </div>
      </section>
    </LandingShell>
  )
}
