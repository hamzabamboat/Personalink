import type { Metadata } from 'next'
import Link from 'next/link'
import { LandingShell } from '@/components/landing/LandingShell'

const URL = 'https://personalink.in/features/anti-ai-humanizer'

export const metadata: Metadata = {
  title: 'Anti-AI Humanizer for LinkedIn Posts | PersonaLink',
  description:
    'PersonaLink’s Anti-AI humanizer strips the tells that make AI posts obvious — em-dash overload, “in today’s fast-paced world”, robotic symmetry — and writes in your real voice.',
  keywords: [
    'AI LinkedIn humanizer',
    'humanize AI LinkedIn posts',
    'make AI posts sound human',
    'LinkedIn posts that don’t sound like AI',
    'anti AI LinkedIn writer',
  ],
  alternates: { canonical: URL },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: URL,
    siteName: 'PersonaLink',
    title: 'The Anti-AI Humanizer — LinkedIn Posts That Don’t Read Like ChatGPT',
    description:
      'Strip the AI tells and write in your real voice. PersonaLink’s Anti-AI humanizer makes automated LinkedIn posts sound human.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'PersonaLink Anti-AI humanizer' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Anti-AI Humanizer for LinkedIn Posts | PersonaLink',
    description: 'Strip the AI tells. Write in your real voice. Posts that don’t read like ChatGPT.',
    images: ['/og-image.png'],
  },
}

const TELLS = [
  'Em-dash overload and suspiciously balanced sentences',
  '“In today’s fast-paced world…” and other filler openers',
  'Rule-of-three everywhere, robotic symmetry',
  'Vague corporate nouns (“synergy”, “leverage”, “landscape”)',
  'No specific detail, no real opinion, no rough edges',
  'The same upbeat register on every single post',
]

const FAQS = [
  { q: 'What is an AI humanizer?', a: 'It’s a layer that rewrites AI-generated text to remove the patterns that make it obviously machine-written. PersonaLink’s goes further: instead of generic “humanizing”, it constrains every draft to your own six-dimension voice fingerprint, so the output sounds specifically like you.' },
  { q: 'How do I make AI LinkedIn posts sound human?', a: 'Cut the filler openers, add a specific detail or a real opinion, vary sentence length, and match your own vocabulary and rhythm. PersonaLink does all of this automatically by writing inside your voice fingerprint rather than a generic assistant voice.' },
  { q: 'Will people be able to tell my posts are AI-assisted?', a: 'The goal is that they can’t — because the draft is built from your real voice and stripped of the usual AI tells. You still review and approve every post, so the final word is always yours.' },
  { q: 'Is this different from ChatGPT?', a: 'Yes. ChatGPT writes in a generic assistant voice and can’t publish for you. PersonaLink writes inside your personal voice fingerprint, removes the AI tells, and schedules and auto-publishes to LinkedIn via the official API.' },
]

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      name: 'PersonaLink — Anti-AI Humanizer',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      description: 'An Anti-AI humanizer that rewrites LinkedIn drafts inside your own voice fingerprint so they don’t read like generic AI.',
      url: URL,
      offers: { '@type': 'AggregateOffer', lowPrice: '999', highPrice: '4999', priceCurrency: 'INR', offerCount: 3, availability: 'https://schema.org/InStock' },
    },
    { '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://personalink.in' },
      { '@type': 'ListItem', position: 2, name: 'Anti-AI Humanizer', item: URL },
    ] },
    { '@type': 'FAQPage', mainEntity: FAQS.map(({ q, a }) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
  ],
}

const wrap = { maxWidth: 880, margin: '0 auto', padding: '0 clamp(16px,4vw,32px)' } as const
const eyebrow = { fontFamily: 'var(--f-mono)', fontSize: 12, letterSpacing: '0.06em', color: 'var(--pl-accent)', textTransform: 'uppercase' as const, marginBottom: 14 }
const h2 = { fontFamily: 'var(--f-sans)', fontWeight: 700, fontSize: 'clamp(22px,3.2vw,32px)', letterSpacing: '-0.03em', color: 'var(--ink)', margin: '0 0 14px' }
const p = { fontSize: 16, lineHeight: 1.7, color: 'var(--ink-3)', margin: '0 0 16px' }
const section = { padding: 'clamp(36px,6vw,56px) 0', borderTop: '1px solid var(--line)' }

export default function AntiAiHumanizerPage() {
  return (
    <LandingShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section style={{ ...wrap, padding: 'clamp(48px,8vw,88px) clamp(16px,4vw,32px) clamp(24px,4vw,40px)' }}>
        <div style={eyebrow}>Anti-AI humanizer</div>
        <h1 style={{ fontFamily: 'var(--f-sans)', fontWeight: 700, fontSize: 'clamp(28px,5.2vw,50px)', letterSpacing: '-0.04em', lineHeight: 1.1, color: 'var(--ink)', margin: '0 0 18px' }}>
          LinkedIn posts that don’t read like ChatGPT
        </h1>
        <p style={{ ...p, fontSize: 18, maxWidth: 680 }}>
          PersonaLink’s Anti-AI humanizer strips the tells that make AI obvious and writes inside your real voice — so
          automated posts still sound like a human wrote them on a day they had time.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 8 }}>
          <Link href="/voice-analyzer" style={{ background: 'var(--ink)', color: 'var(--bg)', padding: '13px 22px', borderRadius: 'var(--r-md)', fontWeight: 600, fontSize: 15, textDecoration: 'none' }}>Analyze my voice — free</Link>
          <Link href="/ai-linkedin-automation-tool" style={{ color: 'var(--ink)', padding: '13px 22px', borderRadius: 'var(--r-md)', fontWeight: 600, fontSize: 15, textDecoration: 'none', border: '1px solid var(--line)' }}>See the full tool</Link>
        </div>
      </section>

      <section style={{ background: 'var(--surface-2)' }}>
        <div style={{ ...wrap, ...section }}>
          <div style={eyebrow}>The tells</div>
          <h2 style={h2}>What screams “an AI wrote this”</h2>
          <ul style={{ margin: '8px 0 0', padding: 0, listStyle: 'none', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 10 }}>
            {TELLS.map((t) => (
              <li key={t} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 14.5, color: 'var(--ink-2)', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-md)', padding: '12px 14px' }}>
                <span style={{ color: '#ef4444', fontWeight: 700, flexShrink: 0 }}>✕</span>{t}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section style={{ ...wrap, ...section }}>
        <div style={eyebrow}>How it works</div>
        <h2 style={h2}>Your voice fingerprint, not a generic one</h2>
        <p style={p}>
          Generic “humanizer” tools just swap synonyms. PersonaLink builds a six-dimension fingerprint of <em>your</em>
          writing — rhythm, vocabulary, openings, pet phrases, emotional register and punctuation — then constrains every
          draft to it and runs a de-cliché pass to remove the AI tells. You get a draft that reads like you, then you
          approve it. It pairs naturally with our <Link href="/hinglish-linkedin-post-generator" style={{ color: 'var(--pl-accent)' }}>Hinglish generator</Link> for code-mixed posts.
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
          <div style={{ marginTop: 28, display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            <Link href="/voice-analyzer" style={{ background: 'var(--ink)', color: 'var(--bg)', padding: '13px 22px', borderRadius: 'var(--r-md)', fontWeight: 600, fontSize: 15, textDecoration: 'none' }}>Analyze my voice — free</Link>
            <Link href="/pricing" style={{ color: 'var(--ink)', padding: '13px 22px', borderRadius: 'var(--r-md)', fontWeight: 600, fontSize: 15, textDecoration: 'none', border: '1px solid var(--line)' }}>See pricing</Link>
          </div>
        </div>
      </section>
    </LandingShell>
  )
}
