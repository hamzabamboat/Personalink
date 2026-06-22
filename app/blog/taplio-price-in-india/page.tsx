import type { Metadata } from 'next'
import Link from 'next/link'
import { LandingShell } from '@/components/landing/LandingShell'
import { getUsdInrRate, inrFromUsd } from '@/lib/fx'
import { inr } from '@/lib/competitor-data'

export const revalidate = 604800

const URL = 'https://personalink.in/blog/taplio-price-in-india'

export const metadata: Metadata = {
  title: 'Taplio price in India: the real INR cost (with GST math)',
  description:
    "Taplio bills in USD — no GST invoice, no UPI. Here's what Taplio actually costs Indian buyers once you add forex markup, the lost 18% GST credit, and compare to INR-native alternatives.",
  keywords: ['Taplio price India', 'Taplio price in INR', 'Taplio cost India', 'Taplio INR', 'Taplio India pricing'],
  alternates: { canonical: URL },
  openGraph: {
    type: 'article', locale: 'en_IN', url: URL, siteName: 'PersonaLink',
    title: 'Taplio price in India: the real INR cost (with GST math)',
    description: "What Taplio actually costs Indian buyers once you add forex markup, the lost 18% GST credit, and compare to INR-native alternatives.",
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Taplio price in India — real INR cost with GST math' }],
  },
  twitter: { card: 'summary_large_image', title: 'Taplio price in India: the real INR cost (with GST math)', description: 'Forex markup + no GST credit: the real cost of Taplio for Indian buyers.', images: ['/og-image.png'] },
}

const FAQS = [
  {
    q: 'How much does Taplio cost in India (in rupees)?',
    a: "Taplio's Standard plan is $39/month and its Pro plan is $65/month. At a typical USD/INR exchange rate plus the 2–3% foreign-currency markup most Indian cards charge, Standard works out to roughly ₹3,400–₹3,700/month and Pro to ₹5,700–₹6,200/month — before accounting for the 18% GST input credit you can't claim because Taplio doesn't issue a GST invoice.",
  },
  {
    q: 'Does Taplio give a GST invoice for Indian businesses?',
    a: "No. Taplio is a US product billed via Stripe in USD. Indian businesses cannot get a GST-compliant invoice from Taplio, which means you can't claim the 18% input tax credit that a GST-registered Indian SaaS vendor would give you. That credit can substantially widen the effective cost gap between Taplio and an INR-native alternative.",
  },
  {
    q: "Does Taplio's Standard ($39) plan include AI writing features?",
    a: "Taplio's Standard plan has limited AI credits. The full AI post-generation feature set is on the Pro tier ($65/month). If your main reason to buy Taplio is AI-written posts, budget for the higher tier.",
  },
  {
    q: 'Can I pay for Taplio with UPI or Razorpay?',
    a: 'No. Taplio bills via Stripe, which accepts international credit and debit cards. UPI is not supported. Indian buyers sometimes encounter Stripe transaction declines or 2FA re-authorisation requirements each billing cycle.',
  },
  {
    q: 'Is there a cheaper Taplio alternative in India that bills in INR?',
    a: 'Yes. PersonaLink bills in INR (starting at ₹999/month), accepts UPI via Razorpay, and issues a GST invoice for every transaction — so Indian businesses can claim 18% input tax credit. It also writes natively in Hinglish and includes a 6-dimension voice fingerprint on every paid plan.',
  },
]

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Article',
      headline: 'Taplio price in India: the real INR cost (with GST math)',
      description: "What Taplio actually costs Indian buyers once you add forex markup, the lost 18% GST credit, and compare to INR-native alternatives.",
      image: 'https://personalink.in/og-image.png',
      datePublished: '2026-06-22',
      dateModified: '2026-06-22',
      inLanguage: 'en-IN',
      author: { '@type': 'Organization', name: 'PersonaLink Team', url: 'https://personalink.in' },
      publisher: {
        '@type': 'Organization',
        name: 'PersonaLink',
        url: 'https://personalink.in',
        logo: { '@type': 'ImageObject', url: 'https://personalink.in/logo.png' },
      },
      mainEntityOfPage: { '@type': 'WebPage', '@id': URL },
      articleSection: 'LinkedIn Tools',
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://personalink.in' },
        { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://personalink.in/blog' },
        { '@type': 'ListItem', position: 3, name: 'Taplio Price in India', item: URL },
      ],
    },
    {
      '@type': 'FAQPage',
      mainEntity: FAQS.map(({ q, a }) => ({
        '@type': 'Question',
        name: q,
        acceptedAnswer: { '@type': 'Answer', text: a },
      })),
    },
  ],
}

const aw = { maxWidth: 720, margin: '0 auto', padding: 'clamp(40px,7vw,72px) clamp(16px,4vw,24px)' } as const
const H1s = { fontSize: 'clamp(28px,5vw,44px)', fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.03em', lineHeight: 1.12, margin: '0 0 18px' } as const
const H2 = { fontSize: 'clamp(20px,3vw,28px)', fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.02em', margin: '40px 0 14px' } as const
const P = { fontSize: 17, lineHeight: 1.75, color: 'var(--ink-2)', margin: '0 0 18px' } as const
const link = { color: 'var(--pl-accent)' } as const

const TAPLIO_PLANS = [
  {
    name: 'Standard',
    usd: 39,
    note: 'Scheduling + basic analytics. Limited AI credits — full AI post generation unlocks on the Pro plan.',
    highlight: false,
  },
  {
    name: 'Pro',
    usd: 65,
    note: 'Full AI post generation, advanced scheduling, inspiration library. The tier most India buyers actually need.',
    highlight: true,
  },
  {
    name: 'Agency',
    usd: 199,
    note: '5 seats for managing multiple LinkedIn accounts.',
    highlight: false,
  },
]

export default async function Page() {
  const rate = await getUsdInrRate()
  const taplioPro = 65
  const fxMarkup = 0.025

  return (
    <LandingShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <article style={aw}>
        <div style={{ fontFamily: 'var(--f-mono)', fontSize: 12, color: 'var(--ink-4)', marginBottom: 12 }}>LinkedIn Tools · 6 min read</div>
        <h1 style={H1s}>Taplio price in India: the real INR cost (with GST math)</h1>
        <p style={P}>
          Taplio's pricing page shows dollars. But if you're buying from India, the real cost is meaningfully higher than
          those headline numbers — thanks to a forex fee your bank adds on every international charge, and the 18% GST
          input tax credit you <em>can't</em> claim because Taplio doesn't issue a GST invoice. Here's the complete
          breakdown.
        </p>

        <h2 style={H2}>Taplio's plans and their INR equivalent today</h2>
        <p style={P}>
          Taplio offers three recurring plans billed in USD via Stripe. The INR prices below reflect today's exchange rate
          (refreshed weekly) but do <em>not</em> include the typical 2–3% foreign-currency markup that most Indian banks
          and cards add on top:
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, margin: '8px 0 24px' }}>
          {TAPLIO_PLANS.map(({ name, usd, note, highlight }) => (
            <div
              key={name}
              style={{
                border: `1px solid ${highlight ? 'var(--pl-accent)' : 'var(--line)'}`,
                background: highlight ? 'var(--pl-accent-soft)' : 'var(--surface)',
                borderRadius: 'var(--r-lg)',
                padding: 18,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, alignItems: 'baseline' }}>
                <strong style={{ fontSize: 17, color: 'var(--ink)' }}>Taplio {name}</strong>
                <span style={{ fontFamily: 'var(--f-mono)', fontSize: 14, color: 'var(--ink-2)', fontWeight: 600 }}>
                  {inr(inrFromUsd(usd, rate))}
                  <span style={{ fontSize: 11, color: 'var(--ink-4)', fontWeight: 400 }}>/mo (≈ ${usd})</span>
                </span>
              </div>
              <p style={{ fontSize: 14.5, lineHeight: 1.6, color: 'var(--ink-3)', margin: '8px 0 0' }}>{note}</p>
            </div>
          ))}
        </div>

        <p style={{ ...P, fontSize: 13.5, color: 'var(--ink-4)' }}>
          Prices converted at the current USD/INR rate, refreshed weekly. Add 2–3% for your bank's foreign-currency fee.
          Use the{' '}
          <Link href="/tools/linkedin-cost-calculator" style={link}>LinkedIn cost calculator</Link> to see your exact
          total with forex.
        </p>

        <h2 style={H2}>The forex fee: what your bank adds</h2>
        <p style={P}>
          Most Indian credit and debit cards charge a 2–3% foreign-currency transaction fee on every international
          payment, on top of the prevailing exchange rate. That means the Taplio Pro plan at today's rate costs closer
          to{' '}
          <strong>{inr(Math.round(inrFromUsd(taplioPro, rate) * (1 + fxMarkup)))}/month</strong> once the bank fee
          lands. Some premium cards waive this — check yours — but even with zero forex markup, the INR equivalent
          shifts every month with USD/INR movements.
        </p>

        <h2 style={H2}>The GST gap: 18% you can't claim back</h2>
        <p style={P}>
          If your business is GST-registered, you can claim input tax credit (ITC) on any GST-compliant invoice — that's
          18% back on every rupee of GST you pay to a registered Indian vendor. Taplio, as a US product billed via
          Stripe, <strong>cannot issue a GST invoice</strong>. You pay the full amount with no ITC. For context, an
          Indian tool at ₹2,499/month includes ₹381 of GST that a GST-registered business can recover; Taplio offers
          no equivalent benefit. Over a year the gap adds up to a meaningful sum — consult your CA for the exact
          calculation for your business.
        </p>

        <h2 style={H2}>What Taplio Standard actually gets you in India</h2>
        <p style={P}>
          Worth noting before you buy: Taplio's $39 Standard plan has limited AI generation credits. If AI-written posts
          are the main reason you're looking at Taplio — the feature most India buyers cite — you'll likely need the{' '}
          <strong>Pro tier at $65/month</strong> ({inr(inrFromUsd(taplioPro, rate))}/mo at today's rate, before forex).
          The Standard plan is more accurately described as an analytics and scheduling tool with a taste of AI on the
          side.
        </p>
        <p style={P}>
          For a full feature-by-feature breakdown including Hinglish support, GST invoices, UPI, and voice-fingerprint
          depth, see the{' '}
          <Link href="/vs/taplio" style={link}>PersonaLink vs Taplio comparison</Link>.
        </p>

        <h2 style={H2}>Side-by-side: real cost for an Indian business buyer</h2>
        <p style={P}>
          Comparing Taplio Pro (the tier needed for full AI) against PersonaLink Standard — both are mid-tier plans for
          active creators posting 15–20 times a month:
        </p>
        <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', overflow: 'hidden', margin: '0 0 8px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 15 }}>
            <thead>
              <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--line)' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--ink-2)', fontWeight: 600 }}>Cost element</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--ink-2)', fontWeight: 600 }}>Taplio Pro</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--pl-accent)', fontWeight: 600 }}>PersonaLink Standard</th>
              </tr>
            </thead>
            <tbody>
              {[
                {
                  label: 'List price',
                  taplio: `${inr(inrFromUsd(taplioPro, rate))}/mo`,
                  pl: '₹2,499/mo',
                },
                {
                  label: 'Forex markup (~2.5%)',
                  taplio: `+${inr(Math.round(inrFromUsd(taplioPro, rate) * fxMarkup))}`,
                  pl: '—',
                },
                {
                  label: 'GST invoice / ITC',
                  taplio: 'None',
                  pl: '✅ 18% ITC claimable',
                },
                {
                  label: 'UPI / Razorpay',
                  taplio: '❌',
                  pl: '✅',
                },
                {
                  label: 'Hinglish posts',
                  taplio: '❌',
                  pl: '✅ Native',
                },
              ].map(({ label, taplio, pl }, i, arr) => (
                <tr key={label} style={{ borderBottom: i < arr.length - 1 ? '1px solid var(--line)' : 'none' }}>
                  <td style={{ padding: '12px 16px', color: 'var(--ink-2)' }}>{label}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--ink-3)' }}>{taplio}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--ink)' }}>{pl}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ ...P, fontSize: 13.5, color: 'var(--ink-4)' }}>
          Forex estimate uses 2.5% — your card's actual rate may differ. ITC claimability depends on your GST
          registration. Consult your CA for business-specific tax advice.
        </p>

        <h2 style={H2}>If Taplio's price is the main blocker</h2>
        <p style={P}>
          The{' '}
          <Link href="/cheap-linkedin-ai-tool-india" style={link}>cheapest LinkedIn AI tools for India</Link> start from
          free and go well below Taplio Pro in INR — with GST invoices and UPI included. If you want the full voice and
          publishing comparison, the{' '}
          <Link href="/vs/taplio" style={link}>PersonaLink vs Taplio</Link> page walks through every feature. Or use the{' '}
          <Link href="/tools/linkedin-cost-calculator" style={link}>LinkedIn cost calculator</Link> to model your exact
          year-one spend across tools.
        </p>
        <p style={P}>
          <Link href="/pricing" style={link}>PersonaLink's Standard plan</Link> is ₹2,499/month — billed in INR,
          GST invoice on every receipt, UPI accepted, Hinglish native, and a 6-dimension voice fingerprint so every
          post sounds like you.
        </p>

        <h2 style={H2}>FAQ</h2>
        {FAQS.map((f) => (
          <details key={f.q} style={{ borderBottom: '1px solid var(--line)' }}>
            <summary style={{ padding: '15px 0', cursor: 'pointer', fontWeight: 600, fontSize: 16, color: 'var(--ink)', listStyle: 'none' }}>
              {f.q}
            </summary>
            <div style={{ paddingBottom: 15, fontSize: 15, lineHeight: 1.7, color: 'var(--ink-4)' }}>{f.a}</div>
          </details>
        ))}

        <div style={{ marginTop: 28 }}>
          <Link
            href="/cheap-linkedin-ai-tool-india"
            style={{ background: 'var(--ink)', color: 'var(--bg)', padding: '13px 22px', borderRadius: 'var(--r-md)', fontWeight: 600, fontSize: 15, textDecoration: 'none' }}
          >
            See India-priced alternatives — from ₹999
          </Link>
        </div>
      </article>
    </LandingShell>
  )
}
