import type { Metadata } from 'next'
import Link from 'next/link'
import { LandingShell } from '@/components/landing/LandingShell'

const URL = 'https://personalink.in/faq'

export const metadata: Metadata = {
  title: 'PersonaLink FAQ — Pricing, GST, Safety, Hinglish',
  description:
    'Answers on PersonaLink pricing in INR, GST invoices, UPI payments, Hinglish posts, LinkedIn safety, the free tier, and how the voice fingerprint works.',
  alternates: { canonical: URL },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: URL,
    siteName: 'PersonaLink',
    title: 'PersonaLink FAQ — Pricing, GST, Safety, Hinglish',
    description: 'INR pricing, GST invoices, UPI, Hinglish, LinkedIn safety, free tier, and how the voice fingerprint works.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'PersonaLink FAQ' }],
  },
}

type QA = { q: string; a: React.ReactNode; schemaA: string }
type Group = { heading: string; items: QA[] }

const GROUPS: Group[] = [
  {
    heading: 'Pricing & INR',
    items: [
      { q: 'How much does PersonaLink cost?', schemaA: 'PersonaLink has a free tier (3 posts a month, no card). Paid plans are Starter ₹999, Standard ₹2,499 and Pro ₹4,999 per month, all in INR. Agency plans are custom. Annual billing saves about 25%.', a: <>There’s a free tier (3 posts/month, no card). Paid plans are <strong>Starter ₹999</strong>, Standard ₹2,499 and Pro ₹4,999 per month — all in INR. Agency is custom. Annual billing saves ~25%. See <Link href="/pricing" style={{ color: 'var(--pl-accent)' }}>pricing</Link>.</> },
      { q: 'Is there an AI LinkedIn tool under ₹1,000?', schemaA: 'Yes — PersonaLink Starter is ₹999/month, billed in INR with a GST invoice. It is the only major India-built LinkedIn AI tool priced under ₹1,000.', a: <>Yes — Starter is <strong>₹999/month</strong> in INR with a GST invoice. More on the <Link href="/cheap-linkedin-ai-tool-india" style={{ color: 'var(--pl-accent)' }}>cheap AI LinkedIn tool for India</Link> page.</> },
      { q: 'Do you bill in INR or USD?', schemaA: 'India accounts are billed in INR. We also support USD, GBP and EUR for non-India accounts.', a: <>India accounts are billed in <strong>INR</strong>. We also support USD/GBP/EUR for international accounts.</> },
    ],
  },
  {
    heading: 'GST & invoices',
    items: [
      { q: 'Do I get a GST invoice?', schemaA: 'Yes — every invoice carries our GSTIN and your registered business name, so you can claim PersonaLink as a deductible business expense and recover 18% as input tax credit.', a: <>Yes. Every invoice carries our GSTIN and your business name, so you can claim it as an expense and recover <strong>18% input tax credit</strong>.</> },
      { q: 'Can I claim PersonaLink as a business expense?', schemaA: 'Yes. Because PersonaLink issues a GST-compliant INR invoice, Indian businesses can claim it as a deductible expense and recover the 18% GST as input tax credit — something USD-billed tools cannot offer.', a: <>Yes — the GST-compliant INR invoice means Indian businesses can deduct it and recover the 18% GST. USD-billed tools can’t offer this.</> },
    ],
  },
  {
    heading: 'Payments',
    items: [
      { q: 'Can I pay with UPI?', schemaA: 'Yes. Payments run through Razorpay with UPI and cards supported — no international card required.', a: <>Yes — payments run through <strong>Razorpay</strong> with UPI and cards. No international card needed.</> },
      { q: 'Is payment secure?', schemaA: 'Yes. Payments are processed by Razorpay, one of India’s most trusted gateways. We never see or store your card details.', a: <>Yes — processed by Razorpay. We never see or store card details.</> },
    ],
  },
  {
    heading: 'Hinglish & India',
    items: [
      { q: 'Can PersonaLink write LinkedIn posts in Hinglish?', schemaA: 'Yes — PersonaLink natively writes natural code-mixed Hinglish, not stiff translated Hindi or forced English. You can control the mix from full Hinglish to light English.', a: <>Yes — natural code-mixed <strong>Hinglish</strong>, not translated Hindi or forced English. You control the mix.</> },
      { q: 'Is PersonaLink built for Indian audiences?', schemaA: 'Yes. PersonaLink is India-first: INR billing, GST invoices, UPI/Razorpay, Hinglish output, India-aware trends and IST scheduling.', a: <>Yes — INR billing, GST invoices, UPI, Hinglish, India-aware trends and IST scheduling.</> },
    ],
  },
  {
    heading: 'LinkedIn safety',
    items: [
      { q: 'Is using PersonaLink against LinkedIn’s rules?', schemaA: 'No. PersonaLink publishes your own content on a schedule through LinkedIn’s official OAuth API and requests posting permission only. It does not scrape, send connection requests, or send DMs — those outreach behaviours are what put accounts at risk.', a: <>No. We publish your own content via official LinkedIn OAuth and request <strong>posting permission only</strong> — no scraping, connections or DMs. See <Link href="/ai-linkedin-automation-tool" style={{ color: 'var(--pl-accent)' }}>how the automation works</Link>.</> },
      { q: 'Will PersonaLink read my DMs or store my password?', schemaA: 'No. PersonaLink uses official LinkedIn OAuth and never reads your messages, never touches your network, and never stores your password.', a: <>No — official OAuth, posting permission only. We never read DMs, touch your network, or store your password.</> },
    ],
  },
  {
    heading: 'Voice & quality',
    items: [
      { q: 'Will the posts actually sound like me?', schemaA: 'Yes. During setup we build a voice fingerprint across six dimensions — rhythm, vocabulary, openings, pet phrases, emotional register and punctuation — and constrain every draft to that fingerprint so it reads like you, not generic AI.', a: <>Yes — we build a 6-dimension voice fingerprint and constrain every draft to it, so it reads like you wrote it.</> },
      { q: 'How is this different from ChatGPT?', schemaA: 'ChatGPT writes in a generic assistant voice. PersonaLink’s Anti-AI humanizer strips the AI tells and writes inside your personal voice fingerprint, then schedules and auto-publishes to LinkedIn — ChatGPT does none of the publishing.', a: <>ChatGPT writes in a generic voice and can’t publish. PersonaLink’s <strong>Anti-AI humanizer</strong> writes in your voice and auto-publishes on schedule.</> },
    ],
  },
  {
    heading: 'Free tier & trial',
    items: [
      { q: 'Is there a free AI LinkedIn tool / free trial?', schemaA: 'Yes. PersonaLink has a free tier — 3 posts a month, one voice fingerprint, no card. Paid plans include a 7-day free trial. You can also analyse your writing voice free with no signup.', a: <>Yes — a free tier (3 posts/month, no card) plus a 7-day trial on paid plans. Try the free <Link href="/voice-analyzer" style={{ color: 'var(--pl-accent)' }}>voice analyzer</Link> — no signup.</> },
      { q: 'Can I cancel anytime?', schemaA: 'Yes — one click in Settings. You keep full access until the end of your billing period, with no win-back hoops.', a: <>Yes — one click in Settings. You keep access to the end of the billing period.</> },
    ],
  },
  {
    heading: 'Agencies',
    items: [
      { q: 'Can I use PersonaLink for multiple client accounts?', schemaA: 'Yes — the Agency plan supports per-client voice fingerprints, a white-label dashboard and INR or international billing. Pricing is custom; request a quote from the agencies page.', a: <>Yes — the Agency plan has per-client voice fingerprints, white-label dashboard and INR/international billing. <Link href="/for-agencies" style={{ color: 'var(--pl-accent)' }}>Request a quote</Link>.</> },
    ],
  },
]

const ALL = GROUPS.flatMap((g) => g.items)
const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    { '@type': 'FAQPage', mainEntity: ALL.map(({ q, schemaA }) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: schemaA } })) },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://personalink.in' },
        { '@type': 'ListItem', position: 2, name: 'FAQ', item: URL },
      ],
    },
  ],
}

const wrap = { maxWidth: 820, margin: '0 auto', padding: '0 clamp(16px,4vw,32px)' } as const

export default function FaqPage() {
  return (
    <LandingShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section style={{ ...wrap, padding: 'clamp(48px,8vw,80px) clamp(16px,4vw,32px) clamp(16px,3vw,28px)' }}>
        <div style={{ fontFamily: 'var(--f-mono)', fontSize: 12, letterSpacing: '0.06em', color: 'var(--pl-accent)', textTransform: 'uppercase', marginBottom: 14 }}>FAQ</div>
        <h1 style={{ fontFamily: 'var(--f-sans)', fontWeight: 700, fontSize: 'clamp(28px,5vw,46px)', letterSpacing: '-0.04em', lineHeight: 1.1, color: 'var(--ink)', margin: '0 0 14px' }}>
          PersonaLink FAQ
        </h1>
        <p style={{ fontSize: 17, lineHeight: 1.7, color: 'var(--ink-3)', maxWidth: 620 }}>
          Pricing in INR, GST invoices, UPI payments, Hinglish, LinkedIn safety, the free tier, and how the voice
          fingerprint works — answered plainly.
        </p>
      </section>

      {GROUPS.map((group) => (
        <section key={group.heading} style={{ ...wrap, padding: 'clamp(20px,3vw,28px) clamp(16px,4vw,32px)' }}>
          <h2 style={{ fontFamily: 'var(--f-mono)', fontSize: 12.5, fontWeight: 600, letterSpacing: '0.06em', color: 'var(--ink-4)', textTransform: 'uppercase', margin: '0 0 6px' }}>{group.heading}</h2>
          {group.items.map((f) => (
            <details key={f.q} style={{ borderBottom: '1px solid var(--line)' }}>
              <summary style={{ padding: '16px 0', cursor: 'pointer', fontWeight: 600, fontSize: 16, color: 'var(--ink)', listStyle: 'none' }}>{f.q}</summary>
              <div style={{ paddingBottom: 16, fontSize: 15, lineHeight: 1.7, color: 'var(--ink-4)' }}>{f.a}</div>
            </details>
          ))}
        </section>
      ))}

      <section style={{ ...wrap, padding: 'clamp(28px,5vw,44px) clamp(16px,4vw,32px)' }}>
        <div style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', padding: 'clamp(20px,4vw,32px)', display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <strong style={{ display: 'block', fontSize: 18, color: 'var(--ink)', marginBottom: 4 }}>Still deciding?</strong>
            <span style={{ fontSize: 14.5, color: 'var(--ink-4)' }}>Analyse your LinkedIn voice free — no signup, no card.</span>
          </div>
          <Link href="/voice-analyzer" style={{ background: 'var(--ink)', color: 'var(--bg)', padding: '13px 22px', borderRadius: 'var(--r-md)', fontWeight: 600, fontSize: 15, textDecoration: 'none', whiteSpace: 'nowrap' }}>Analyze my voice — free</Link>
        </div>
      </section>
    </LandingShell>
  )
}
