import type { Metadata } from 'next'
import Link from 'next/link'
import { LandingShell } from '@/components/landing/LandingShell'

const URL = 'https://personalink.in/blog/how-to-humanize-ai-linkedin-posts'

export const metadata: Metadata = {
  title: 'How to Humanize AI LinkedIn Posts (So They Don’t Sound Like AI)',
  description:
    'AI-written LinkedIn posts have obvious tells. Here’s how to humanize them — the 10 giveaways to cut, the manual fixes, and why voice-matching beats find-and-replace.',
  keywords: ['how to humanize AI content', 'humanize AI LinkedIn posts', 'make AI posts sound human', 'LinkedIn posts that don’t sound like AI'],
  alternates: { canonical: URL },
  openGraph: { type: 'article', locale: 'en_IN', url: URL, siteName: 'PersonaLink', title: 'How to Humanize AI LinkedIn Posts (So They Don’t Sound Like AI)', description: 'The 10 AI tells to cut, the manual fixes, and why voice-matching wins.', images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'How to humanize AI LinkedIn posts' }] },
  twitter: { card: 'summary_large_image', title: 'How to Humanize AI LinkedIn Posts', description: 'The 10 AI tells to cut, the fixes, and why voice-matching beats find-and-replace.', images: ['/og-image.png'] },
}

const FAQS = [
  { q: 'How do I make AI LinkedIn posts sound human?', a: 'Cut the filler openers, add one specific detail or a real opinion, vary your sentence length, and match your own vocabulary and rhythm. The fastest way is to generate the draft inside your own voice profile in the first place, rather than “humanizing” a generic draft afterwards.' },
  { q: 'What are the signs a LinkedIn post was written by AI?', a: 'Filler openers like “in today’s fast-paced world”, em-dash overload, suspiciously balanced rule-of-three sentences, vague corporate nouns, no specific details, and the same upbeat tone on every post.' },
  { q: 'Do AI humanizer tools work?', a: 'Generic humanizers that just swap synonyms help a little. What works better is constraining the draft to your real voice from the start — your rhythm, vocabulary and openings — so there’s nothing generic to disguise.' },
]

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    { '@type': 'Article', headline: 'How to Humanize AI LinkedIn Posts (So They Don’t Sound Like AI)', description: 'The 10 AI tells to cut, the manual fixes, and why voice-matching beats find-and-replace.', image: 'https://personalink.in/og-image.png', datePublished: '2026-06-08', dateModified: '2026-06-08', inLanguage: 'en-IN', author: { '@type': 'Organization', name: 'PersonaLink Team', url: 'https://personalink.in' }, publisher: { '@type': 'Organization', name: 'PersonaLink', url: 'https://personalink.in', logo: { '@type': 'ImageObject', url: 'https://personalink.in/logo.png' } }, mainEntityOfPage: { '@type': 'WebPage', '@id': URL }, articleSection: 'LinkedIn Growth' },
    { '@type': 'BreadcrumbList', itemListElement: [ { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://personalink.in' }, { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://personalink.in/blog' }, { '@type': 'ListItem', position: 3, name: 'How to Humanize AI LinkedIn Posts', item: URL } ] },
    { '@type': 'FAQPage', mainEntity: FAQS.map(({ q, a }) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
  ],
}

const aw = { maxWidth: 720, margin: '0 auto', padding: 'clamp(40px,7vw,72px) clamp(16px,4vw,24px)' } as const
const H1s = { fontSize: 'clamp(28px,5vw,44px)', fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.03em', lineHeight: 1.12, margin: '0 0 18px' } as const
const H2 = { fontSize: 'clamp(20px,3vw,28px)', fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.02em', margin: '38px 0 12px' } as const
const P = { fontSize: 17, lineHeight: 1.75, color: 'var(--ink-2)', margin: '0 0 16px' } as const
const UL = { margin: '0 0 18px', paddingLeft: 22, color: 'var(--ink-2)', fontSize: 16.5, lineHeight: 1.8 } as const
const link = { color: 'var(--pl-accent)' } as const

const TELLS = [
  '“In today’s fast-paced world…” and other filler openers',
  'Em-dash overload and suspiciously balanced sentences',
  'Rule-of-three everywhere (“faster, smarter, better”)',
  'Vague corporate nouns: synergy, leverage, landscape, journey',
  'Zero specific detail — no names, numbers, or real moments',
  'No actual opinion or risk',
  'The same upbeat register on every post',
  'Over-explaining the obvious',
  'Hashtag soup at the end',
  'A tidy “In conclusion…” bow',
]

export default function Page() {
  return (
    <LandingShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <article style={aw}>
        <div style={{ fontFamily: 'var(--f-mono)', fontSize: 12, color: 'var(--ink-4)', marginBottom: 12 }}>LinkedIn Growth · 6 min read</div>
        <h1 style={H1s}>How to humanize AI LinkedIn posts (so they don’t sound like AI)</h1>
        <p style={P}>AI can draft a LinkedIn post in seconds. The problem is everyone can tell. Here’s how to strip the tells and make an AI draft read like a human actually wrote it — and the shortcut that skips the whole clean-up.</p>
        <h2 style={H2}>The 10 tells that scream “AI wrote this”</h2>
        <ul style={UL}>{TELLS.map((t) => <li key={t}>{t}</li>)}</ul>
        <h2 style={H2}>The manual fixes</h2>
        <p style={P}>Cut the first sentence (it’s almost always filler). Add one concrete detail — a name, a number, a real moment. Put in an actual opinion you’d defend. Vary sentence length: short. Then a longer one that earns its space. Read it aloud — if you wouldn’t say it, rewrite it. Kill the “in conclusion” bow.</p>
        <h2 style={H2}>Why voice-matching beats find-and-replace</h2>
        <p style={P}>The deeper problem is that a generic draft has nothing of <em>you</em> in it, so you’re reverse-engineering a personality onto finished text. It’s far easier to generate the draft inside your own voice from the start — your rhythm, your vocabulary, your openings — so there’s no generic to disguise. That’s exactly what a <Link href="/features/anti-ai-humanizer" style={link}>voice-fingerprint humanizer</Link> does.</p>
        <h2 style={H2}>The shortcut</h2>
        <p style={P}><Link href="/ai-linkedin-automation-tool" style={link}>PersonaLink</Link> builds a six-dimension fingerprint of your writing and constrains every draft to it, then runs a de-cliché pass automatically. You start humanized. Try it on your own writing with the free <Link href="/voice-analyzer" style={link}>voice analyzer</Link>.</p>
        <h2 style={H2}>FAQ</h2>
        {FAQS.map((f) => (
          <details key={f.q} style={{ borderBottom: '1px solid var(--line)' }}>
            <summary style={{ padding: '15px 0', cursor: 'pointer', fontWeight: 600, fontSize: 16, color: 'var(--ink)', listStyle: 'none' }}>{f.q}</summary>
            <div style={{ paddingBottom: 15, fontSize: 15, lineHeight: 1.7, color: 'var(--ink-4)' }}>{f.a}</div>
          </details>
        ))}
        <div style={{ marginTop: 28 }}><Link href="/voice-analyzer" style={{ background: 'var(--ink)', color: 'var(--bg)', padding: '13px 22px', borderRadius: 'var(--r-md)', fontWeight: 600, fontSize: 15, textDecoration: 'none' }}>Analyze my voice — free</Link></div>
      </article>
    </LandingShell>
  )
}
