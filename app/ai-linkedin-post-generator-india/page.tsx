import type { Metadata } from 'next'
import Link from 'next/link'
import { LandingShell } from '@/components/landing/LandingShell'

const URL = 'https://personalink.in/ai-linkedin-post-generator-india'

export const metadata: Metadata = {
  title: 'AI LinkedIn Post Generator for India | PersonaLink',
  description:
    'An AI LinkedIn post generator built for India — write posts in your own voice, in English or Hinglish, billed in INR with GST invoices. Free to start, from ₹999/month.',
  keywords: [
    'AI LinkedIn post generator India',
    'LinkedIn post generator for Indian professionals',
    'AI LinkedIn post generator',
    'Hinglish LinkedIn post generator',
    'LinkedIn post generator INR',
    'AI LinkedIn writer India',
  ],
  alternates: { canonical: URL },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: URL,
    siteName: 'PersonaLink',
    title: 'AI LinkedIn Post Generator for India | PersonaLink',
    description:
      'Generate LinkedIn posts in your own voice — English or Hinglish — billed in INR with GST invoices. Free to start, from ₹999/month.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'PersonaLink — AI LinkedIn post generator for India' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI LinkedIn Post Generator for India | PersonaLink',
    description: 'Posts in your voice, English or Hinglish. INR billing, GST invoices. Free to start.',
    images: ['/og-image.png'],
  },
}

const FAQS = [
  {
    q: 'What makes this an India-first LinkedIn post generator?',
    a: 'PersonaLink is built for Indian creators: it writes in natural code-mixed Hinglish as well as English, bills in INR via UPI/Razorpay, issues a GST invoice on every plan, and schedules around IST. Most AI LinkedIn generators are USD-only and English-only.',
  },
  {
    q: 'Will the generated posts sound like me or like generic AI?',
    a: 'Like you. We build a voice fingerprint across six dimensions — sentence rhythm, vocabulary, openings, pet phrases, emotional register and punctuation — and our Anti-AI humanizer keeps every draft inside that fingerprint, so posts do not read like ChatGPT.',
  },
  {
    q: 'Can it generate posts in Hinglish?',
    a: 'Yes — natively. You can generate in English, in Hinglish (e.g. "yeh wala launch thoda different hai"), or a mix. It does not force-translate into stiff Hindi or flatten into pure English.',
  },
  {
    q: 'How much does the post generator cost in INR?',
    a: 'There is a free tier (3 posts a month, no card). Paid plans are billed in INR with a GST invoice: Starter ₹999, Standard ₹2,499, Pro ₹4,999 per month. See the pricing page for details.',
  },
  {
    q: 'Can I turn a voice note or an old blog into a LinkedIn post?',
    a: 'Yes. Record a 2-minute voice note or paste an existing piece, and PersonaLink turns it into a structured LinkedIn post in your voice — then you can schedule or auto-publish it through official LinkedIn OAuth.',
  },
]

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      name: 'PersonaLink — AI LinkedIn Post Generator for India',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      description:
        'AI LinkedIn post generator built for India: writes posts in your own voice in English or Hinglish, billed in INR with GST invoices.',
      url: URL,
      offers: { '@type': 'AggregateOffer', lowPrice: '999', highPrice: '4999', priceCurrency: 'INR', offerCount: 3, availability: 'https://schema.org/InStock' },
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://personalink.in' },
        { '@type': 'ListItem', position: 2, name: 'AI LinkedIn Post Generator for India', item: URL },
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

export default function AiLinkedinPostGeneratorIndiaPage() {
  return (
    <LandingShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Hero */}
      <section style={{ ...wrap, padding: 'clamp(48px,8vw,88px) clamp(16px,4vw,32px) clamp(24px,4vw,40px)' }}>
        <div style={eyebrow}>AI LinkedIn post generator · India</div>
        <h1 style={{ fontFamily: 'var(--f-sans)', fontWeight: 700, fontSize: 'clamp(30px,5.5vw,52px)', letterSpacing: '-0.04em', lineHeight: 1.08, color: 'var(--ink)', margin: '0 0 18px' }}>
          AI LinkedIn post generator, built for India
        </h1>
        <p style={{ ...p, fontSize: 18, maxWidth: 680 }}>
          Generate LinkedIn posts that sound like <em>you</em> — in English or Hinglish — and schedule them in a click.
          Billed in INR, GST invoice on every plan, UPI and Razorpay supported. Start free.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 8 }}>
          <Link href="/voice-analyzer" style={{ background: 'var(--ink)', color: 'var(--bg)', padding: '13px 22px', borderRadius: 'var(--r-md)', fontWeight: 600, fontSize: 15, textDecoration: 'none' }}>Analyze my voice — free</Link>
          <Link href="/pricing" style={{ background: 'transparent', color: 'var(--ink)', padding: '13px 22px', borderRadius: 'var(--r-md)', fontWeight: 600, fontSize: 15, textDecoration: 'none', border: '1px solid var(--line)' }}>See pricing — from ₹999</Link>
        </div>
      </section>

      {/* In your voice */}
      <section style={{ background: 'var(--surface-2)' }}>
        <div style={{ ...wrap, ...section, borderTop: '1px solid var(--line)' }}>
          <div style={eyebrow}>Not generic AI</div>
          <h2 style={h2}>Posts in your voice, not ChatGPT’s</h2>
          <p style={p}>
            Most LinkedIn post generators produce the same flat, em-dash-heavy AI voice. PersonaLink builds a{' '}
            <strong>six-dimension voice fingerprint</strong> from your past posts — rhythm, vocabulary, openings, pet
            phrases, emotional register and punctuation — and constrains every draft to it. The result reads like you on
            a day you had time to write.
          </p>
          <p style={p}>
            Want to hear it first?{' '}
            <Link href="/voice-analyzer" style={{ color: 'var(--pl-accent)' }}>Analyze your writing voice free</Link>{' '}
            — no signup — then generate from{' '}
            <Link href="/features/voice-to-post" style={{ color: 'var(--pl-accent)' }}>a thought or a voice note</Link>.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section style={{ ...wrap, ...section }}>
        <div style={eyebrow}>How it works</div>
        <h2 style={h2}>From blank page to scheduled post in four steps</h2>
        <ol style={{ margin: '8px 0 0', padding: 0, listStyle: 'none', display: 'grid', gap: 14 }}>
          {[
            ['Build your voice fingerprint', 'Paste 3–5 of your posts. We map six voice dimensions so every generated post sounds like you.'],
            ['Generate in English or Hinglish', 'Type a thought, record a voice note, or repurpose an old post — and pick the language mix that fits your audience.'],
            ['Choose your control mode', 'Full Autopilot, Approve Before Posting, or Suggest Only. You always own the publish button.'],
            ['Schedule around IST', 'Auto-publish at high-attention India times via official LinkedIn OAuth, then see what landed.'],
          ].map(([t, d], i) => (
            <li key={t} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              <span style={{ flexShrink: 0, width: 30, height: 30, borderRadius: '50%', background: 'var(--pl-accent-soft)', color: 'var(--pl-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--f-mono)', fontSize: 13, fontWeight: 600, border: '1px solid var(--pl-accent)' }}>{i + 1}</span>
              <div>
                <strong style={{ display: 'block', fontSize: 16, color: 'var(--ink)', marginBottom: 4 }}>{t}</strong>
                <span style={{ fontSize: 15, lineHeight: 1.65, color: 'var(--ink-4)' }}>{d}</span>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Built for India */}
      <section style={{ background: 'var(--surface-2)' }}>
        <div style={{ ...wrap, ...section, borderTop: '1px solid var(--line)' }}>
          <div style={eyebrow}>Built for India</div>
          <h2 style={h2}>The post generator that bills in rupees</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 14, marginTop: 8 }}>
            {[
              ['INR billing', 'Pay in rupees — no USD forex surcharge, no 2FA card failures.'],
              ['GST invoice', 'GSTIN on every invoice, so your business can claim 18% input tax credit.'],
              ['UPI & Razorpay', 'Pay the way India pays. Cards optional.'],
              ['Hinglish posts', 'Generate natural code-mixed Hinglish — not stiff translated Hindi or forced English.'],
            ].map(([t, d]) => (
              <div key={t} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', padding: 20 }}>
                <strong style={{ display: 'block', fontSize: 15, color: 'var(--ink)', marginBottom: 6 }}>{t}</strong>
                <span style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--ink-4)' }}>{d}</span>
              </div>
            ))}
          </div>
          <p style={{ ...p, marginTop: 22 }}>
            On a budget? Starter is <strong>₹999/month</strong> — see the{' '}
            <Link href="/cheap-linkedin-ai-tool-india" style={{ color: 'var(--pl-accent)' }}>AI LinkedIn tool for India under ₹1,000</Link>, the{' '}
            <Link href="/hinglish-linkedin-post-generator" style={{ color: 'var(--pl-accent)' }}>Hinglish post generator</Link>, or full{' '}
            <Link href="/pricing" style={{ color: 'var(--pl-accent)' }}>pricing</Link>.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ ...wrap, ...section }}>
        <h2 style={h2}>FAQ</h2>
        <div style={{ marginTop: 8 }}>
          {FAQS.map((f) => (
            <details key={f.q} style={{ borderBottom: '1px solid var(--line)' }}>
              <summary style={{ padding: '16px 0', cursor: 'pointer', fontWeight: 600, fontSize: 15.5, color: 'var(--ink)', listStyle: 'none' }}>{f.q}</summary>
              <div style={{ paddingBottom: 16, fontSize: 14.5, lineHeight: 1.7, color: 'var(--ink-4)' }}>{f.a}</div>
            </details>
          ))}
        </div>
        <div style={{ marginTop: 28, display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          <Link href="/voice-analyzer" style={{ background: 'var(--ink)', color: 'var(--bg)', padding: '13px 22px', borderRadius: 'var(--r-md)', fontWeight: 600, fontSize: 15, textDecoration: 'none' }}>Start with a free voice analysis</Link>
          <Link href="/ai-linkedin-automation-tool" style={{ color: 'var(--ink)', padding: '13px 22px', borderRadius: 'var(--r-md)', fontWeight: 600, fontSize: 15, textDecoration: 'none', border: '1px solid var(--line)' }}>How the automation works</Link>
        </div>
      </section>
    </LandingShell>
  )
}
