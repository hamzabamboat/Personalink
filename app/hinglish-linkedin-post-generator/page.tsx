import type { Metadata } from 'next'
import Link from 'next/link'
import { LandingShell } from '@/components/landing/LandingShell'

const URL = 'https://personalink.in/hinglish-linkedin-post-generator'

export const metadata: Metadata = {
  title: 'Hinglish LinkedIn Post Generator (AI) | PersonaLink',
  description:
    'Generate natural code-mixed Hinglish LinkedIn posts with AI — not stiff translated Hindi or forced English. Built for Indian founders and creators. Free to try.',
  keywords: [
    'Hinglish LinkedIn post generator',
    'Hinglish LinkedIn AI',
    'code-mixed LinkedIn posts AI',
    'Hindi English LinkedIn post writer',
    'AI LinkedIn writer Hinglish',
  ],
  alternates: { canonical: URL },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: URL,
    siteName: 'PersonaLink',
    title: 'Hinglish LinkedIn Post Generator That Doesn’t Sound Translated',
    description:
      'AI that writes natural code-mixed Hinglish LinkedIn posts — controllable from full Hinglish to light English. Built for India.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Hinglish LinkedIn post generator' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hinglish LinkedIn Post Generator (AI) | PersonaLink',
    description: 'Natural code-mixed Hinglish LinkedIn posts — not translated Hindi or forced English.',
    images: ['/og-image.png'],
  },
}

const FAQS = [
  { q: 'Can AI write LinkedIn posts in Hinglish?', a: 'Yes. PersonaLink writes natural code-mixed Hinglish — the way Indian professionals actually speak — rather than translating to pure Hindi or flattening to pure English. You control how much Hindi vs English to mix.' },
  { q: 'Will the Hinglish sound natural or forced?', a: 'Natural. Most tools are English-first and either transliterate Hindi or formalise it. PersonaLink models your real voice across six dimensions and keeps the code-mixing where you’d naturally put it, so it reads like you, not a translator.' },
  { q: 'Can I control how much Hindi vs English?', a: 'Yes — set the mix from full Hinglish to light English sprinkles, and it stays consistent with your voice fingerprint across every post.' },
  { q: 'Is it free to try?', a: 'You can analyse your writing voice free with no signup, and the free tier includes 3 posts a month. Paid plans start at ₹999/month with INR billing and a GST invoice.' },
]

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      name: 'PersonaLink — Hinglish LinkedIn Post Generator',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      description: 'AI that generates natural code-mixed Hinglish LinkedIn posts in your own voice. Built for India, billed in INR.',
      url: URL,
      offers: { '@type': 'AggregateOffer', lowPrice: '999', highPrice: '4999', priceCurrency: 'INR', offerCount: 3, availability: 'https://schema.org/InStock' },
    },
    { '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://personalink.in' },
      { '@type': 'ListItem', position: 2, name: 'Hinglish LinkedIn Post Generator', item: URL },
    ] },
    { '@type': 'FAQPage', mainEntity: FAQS.map(({ q, a }) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
  ],
}

const wrap = { maxWidth: 880, margin: '0 auto', padding: '0 clamp(16px,4vw,32px)' } as const
const eyebrow = { fontFamily: 'var(--f-mono)', fontSize: 12, letterSpacing: '0.06em', color: 'var(--pl-accent)', textTransform: 'uppercase' as const, marginBottom: 14 }
const h2 = { fontFamily: 'var(--f-sans)', fontWeight: 700, fontSize: 'clamp(22px,3.2vw,32px)', letterSpacing: '-0.03em', color: 'var(--ink)', margin: '0 0 14px' }
const p = { fontSize: 16, lineHeight: 1.7, color: 'var(--ink-3)', margin: '0 0 16px' }
const section = { padding: 'clamp(36px,6vw,56px) 0', borderTop: '1px solid var(--line)' }

export default function HinglishPage() {
  return (
    <LandingShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section style={{ ...wrap, padding: 'clamp(48px,8vw,88px) clamp(16px,4vw,32px) clamp(24px,4vw,40px)' }}>
        <div style={eyebrow}>Hinglish LinkedIn post generator</div>
        <h1 style={{ fontFamily: 'var(--f-sans)', fontWeight: 700, fontSize: 'clamp(28px,5.2vw,50px)', letterSpacing: '-0.04em', lineHeight: 1.1, color: 'var(--ink)', margin: '0 0 18px' }}>
          A Hinglish LinkedIn post generator that doesn’t sound translated
        </h1>
        <p style={{ ...p, fontSize: 18, maxWidth: 680 }}>
          PersonaLink writes natural code-mixed Hinglish — the way Indian professionals actually talk — instead of stiff
          translated Hindi or over-formal English. In your voice, billed in INR, with a GST invoice.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 8 }}>
          <Link href="/voice-analyzer" style={{ background: 'var(--ink)', color: 'var(--bg)', padding: '13px 22px', borderRadius: 'var(--r-md)', fontWeight: 600, fontSize: 15, textDecoration: 'none' }}>Analyze my voice — free</Link>
          <Link href="/cheap-linkedin-ai-tool-india" style={{ color: 'var(--ink)', padding: '13px 22px', borderRadius: 'var(--r-md)', fontWeight: 600, fontSize: 15, textDecoration: 'none', border: '1px solid var(--line)' }}>Pricing from ₹999</Link>
        </div>
      </section>

      <section style={{ background: 'var(--surface-2)' }}>
        <div style={{ ...wrap, ...section }}>
          <div style={eyebrow}>The problem</div>
          <h2 style={h2}>Why English-only AI mangles Hinglish</h2>
          <p style={p}>
            Most LinkedIn AI tools are English-first. Give them a Hinglish thought and they either translate it into pure
            Hindi, transliterate it awkwardly, or flatten it into corporate English — losing the exact thing that makes it
            sound like a real Indian professional.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 14, marginTop: 12 }}>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', padding: 18 }}>
              <div style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--ink-4)', marginBottom: 8 }}>// English-only tool (illustrative)</div>
              <p style={{ fontSize: 14.5, color: 'var(--ink-3)', lineHeight: 1.6, margin: 0, fontStyle: 'italic' }}>“This launch is slightly different from our previous ones, and we are very excited to share it with our audience.”</p>
            </div>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--pl-accent)', borderRadius: 'var(--r-lg)', padding: 18 }}>
              <div style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--pl-accent)', marginBottom: 8 }}>// PersonaLink Hinglish (illustrative)</div>
              <p style={{ fontSize: 14.5, color: 'var(--ink-2)', lineHeight: 1.6, margin: 0, fontStyle: 'italic' }}>“Yeh wala launch thoda alag hai — and honestly, I’m a little nervous sharing it. Par chalo, let’s see what you think.”</p>
            </div>
          </div>
        </div>
      </section>

      <section style={{ ...wrap, ...section }}>
        <div style={eyebrow}>How it works</div>
        <h2 style={h2}>Natural Hinglish, in your voice</h2>
        <p style={p}>
          PersonaLink builds a six-dimension voice fingerprint from your past posts — including where you naturally
          code-switch — and constrains every draft to it. The result keeps your rhythm, your slang, and your English-Hindi
          mix exactly where you’d put it. Our <Link href="/features/anti-ai-humanizer" style={{ color: 'var(--pl-accent)' }}>Anti-AI humanizer</Link> then strips the robotic tells, so it never reads like a machine translated it.
        </p>
      </section>

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
            <Link href="/voice-analyzer" style={{ background: 'var(--ink)', color: 'var(--bg)', padding: '13px 22px', borderRadius: 'var(--r-md)', fontWeight: 600, fontSize: 15, textDecoration: 'none' }}>Try a free voice analysis</Link>
          </div>
        </div>
      </section>
    </LandingShell>
  )
}
