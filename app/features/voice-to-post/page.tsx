import type { Metadata } from 'next'
import Link from 'next/link'
import { LandingShell } from '@/components/landing/LandingShell'

const URL = 'https://personalink.in/features/voice-to-post'

export const metadata: Metadata = {
  title: 'Voice Note to LinkedIn Post (AI) | PersonaLink',
  description:
    'Record a voice note and PersonaLink transcribes, structures and writes it as a LinkedIn post in your voice. Perfect for busy founders on the move. Hinglish supported.',
  keywords: ['voice note to LinkedIn post', 'voice to LinkedIn post AI', 'turn voice notes into LinkedIn posts', 'dictate LinkedIn posts'],
  alternates: { canonical: URL },
  openGraph: { type: 'website', locale: 'en_IN', url: URL, siteName: 'PersonaLink', title: 'Turn a 2-Minute Voice Note Into a LinkedIn Post', description: 'Record, and PersonaLink writes it as a post in your voice. Hinglish supported.', images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Voice note to LinkedIn post' }] },
  twitter: { card: 'summary_large_image', title: 'Voice Note to LinkedIn Post (AI) | PersonaLink', description: 'Record a voice note, ship a polished LinkedIn post in your voice.', images: ['/og-image.png'] },
}

const FAQS = [
  { q: 'Can I turn a voice note into a LinkedIn post?', a: 'Yes. Record a voice note on your phone, and PersonaLink transcribes it, structures the idea, and writes it as a LinkedIn post in your own voice — ready to review and schedule.' },
  { q: 'Does it work in Hinglish?', a: 'Yes — ramble in Hinglish and PersonaLink keeps the natural code-mixing in the final post instead of flattening it to English.' },
  { q: 'How long can the voice note be?', a: 'A couple of minutes is plenty — most good posts come from a 1–2 minute ramble. PersonaLink pulls out the core idea rather than transcribing everything verbatim.' },
  { q: 'Will it still sound like me?', a: 'Yes — the draft is constrained to your six-dimension voice fingerprint, so a dictated post reads like your writing, not a transcript.' },
]

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    { '@type': 'SoftwareApplication', name: 'PersonaLink — Voice Note to LinkedIn Post', applicationCategory: 'BusinessApplication', operatingSystem: 'Web', description: 'Record a voice note and PersonaLink writes it as a LinkedIn post in your voice.', url: URL, offers: { '@type': 'AggregateOffer', lowPrice: '999', highPrice: '4999', priceCurrency: 'INR', offerCount: 3, availability: 'https://schema.org/InStock' } },
    { '@type': 'BreadcrumbList', itemListElement: [ { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://personalink.in' }, { '@type': 'ListItem', position: 2, name: 'Features', item: 'https://personalink.in/features' }, { '@type': 'ListItem', position: 3, name: 'Voice to post', item: URL } ] },
    { '@type': 'FAQPage', mainEntity: FAQS.map(({ q, a }) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
  ],
}

const wrap = { maxWidth: 820, margin: '0 auto', padding: '0 clamp(16px,4vw,32px)' } as const
const eyebrow = { fontFamily: 'var(--f-mono)', fontSize: 12, letterSpacing: '0.06em', color: 'var(--pl-accent)', textTransform: 'uppercase' as const, marginBottom: 14 }
const h2 = { fontFamily: 'var(--f-sans)', fontWeight: 700, fontSize: 'clamp(22px,3.2vw,30px)', letterSpacing: '-0.03em', color: 'var(--ink)', margin: '0 0 14px' }
const p = { fontSize: 16, lineHeight: 1.7, color: 'var(--ink-3)', margin: '0 0 16px' }
const section = { padding: 'clamp(32px,5vw,52px) 0', borderTop: '1px solid var(--line)' }

export default function VoiceToPostPage() {
  return (
    <LandingShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <section style={{ ...wrap, padding: 'clamp(48px,8vw,84px) clamp(16px,4vw,32px) clamp(20px,4vw,36px)' }}>
        <div style={eyebrow}>Feature · Voice to post</div>
        <h1 style={{ fontFamily: 'var(--f-sans)', fontWeight: 700, fontSize: 'clamp(28px,5vw,46px)', letterSpacing: '-0.04em', lineHeight: 1.12, color: 'var(--ink)', margin: '0 0 18px' }}>
          Turn a 2-minute voice note into a polished LinkedIn post
        </h1>
        <p style={{ ...p, fontSize: 18, maxWidth: 660 }}>Record while you walk. PersonaLink transcribes, structures and writes it as a post in your voice — Hinglish included. You just review and schedule.</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 8 }}>
          <Link href="/voice-analyzer" style={{ background: 'var(--ink)', color: 'var(--bg)', padding: '13px 22px', borderRadius: 'var(--r-md)', fontWeight: 600, fontSize: 15, textDecoration: 'none' }}>Analyze my voice — free</Link>
          <Link href="/pricing" style={{ color: 'var(--ink)', padding: '13px 22px', borderRadius: 'var(--r-md)', fontWeight: 600, fontSize: 15, textDecoration: 'none', border: '1px solid var(--line)' }}>Pricing from ₹999</Link>
        </div>
      </section>
      <section style={{ background: 'var(--surface-2)' }}><div style={{ ...wrap, ...section }}>
        <div style={eyebrow}>Why</div>
        <h2 style={h2}>Typing is the bottleneck, not ideas</h2>
        <p style={p}>You have plenty to say — between meetings, on a commute, after a call. What stops you is sitting down to type it up. Voice-to-post removes that step: speak the thought, get a structured draft back.</p>
      </div></section>
      <section style={{ ...wrap, ...section }}>
        <div style={eyebrow}>How it works</div>
        <h2 style={h2}>Record → transcribe → structure → your-voice draft</h2>
        <ol style={{ margin: '8px 0 0', padding: 0, listStyle: 'none', display: 'grid', gap: 12 }}>
          {[['Record', 'Hit record on your phone — ramble for a minute or two, in English or Hinglish.'], ['Transcribe & structure', 'We pull out the core idea and shape it into a post — hook, body, takeaway.'], ['Write in your voice', 'The draft is constrained to your voice fingerprint, so it reads like you wrote it.'], ['Review & schedule', 'Approve it and queue it for a peak IST slot, or auto-publish.']].map(([t, d], i) => (
            <li key={t} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <span style={{ flexShrink: 0, width: 28, height: 28, borderRadius: '50%', background: 'var(--pl-accent-soft)', color: 'var(--pl-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--f-mono)', fontSize: 12, fontWeight: 600, border: '1px solid var(--pl-accent)' }}>{i + 1}</span>
              <div><strong style={{ display: 'block', fontSize: 15.5, color: 'var(--ink)', marginBottom: 3 }}>{t}</strong><span style={{ fontSize: 14.5, lineHeight: 1.6, color: 'var(--ink-4)' }}>{d}</span></div>
            </li>
          ))}
        </ol>
        <p style={{ ...p, marginTop: 18 }}>Pairs perfectly with the <Link href="/hinglish-linkedin-post-generator" style={{ color: 'var(--pl-accent)' }}>Hinglish generator</Link> and the <Link href="/features/repurpose-engine" style={{ color: 'var(--pl-accent)' }}>repurpose engine</Link>.</p>
      </section>
      <section style={{ background: 'var(--surface-2)' }}><div style={{ ...wrap, ...section }}>
        <h2 style={h2}>FAQ</h2>
        <div style={{ marginTop: 8 }}>{FAQS.map((f) => (<details key={f.q} style={{ borderBottom: '1px solid var(--line)' }}><summary style={{ padding: '15px 0', cursor: 'pointer', fontWeight: 600, fontSize: 15.5, color: 'var(--ink)', listStyle: 'none' }}>{f.q}</summary><div style={{ paddingBottom: 15, fontSize: 14.5, lineHeight: 1.7, color: 'var(--ink-4)' }}>{f.a}</div></details>))}</div>
        <div style={{ marginTop: 26 }}><Link href="/voice-analyzer" style={{ background: 'var(--ink)', color: 'var(--bg)', padding: '13px 22px', borderRadius: 'var(--r-md)', fontWeight: 600, fontSize: 15, textDecoration: 'none' }}>Try it free</Link></div>
      </div></section>
    </LandingShell>
  )
}
