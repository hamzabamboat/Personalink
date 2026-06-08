import type { Metadata } from 'next'
import Link from 'next/link'
import { LandingShell } from '@/components/landing/LandingShell'

const URL = 'https://personalink.in/features/repurpose-engine'

export const metadata: Metadata = {
  title: 'LinkedIn Content Repurpose Engine | PersonaLink',
  description:
    'Turn one winning LinkedIn post — or a blog, podcast or newsletter — into a week of fresh angles in your voice with PersonaLink’s repurpose engine.',
  keywords: ['repurpose content for LinkedIn', 'turn blog into LinkedIn posts', 'LinkedIn content repurposing tool', 'repurpose one post into many'],
  alternates: { canonical: URL },
  openGraph: { type: 'website', locale: 'en_IN', url: URL, siteName: 'PersonaLink', title: 'One Post, Five Formats — The LinkedIn Repurpose Engine', description: 'Turn one post or a blog/podcast into a week of fresh angles in your voice.', images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'LinkedIn repurpose engine' }] },
  twitter: { card: 'summary_large_image', title: 'LinkedIn Content Repurpose Engine | PersonaLink', description: 'One post → a week of fresh angles, in your voice.', images: ['/og-image.png'] },
}

const FAQS = [
  { q: 'How do I repurpose a blog post into LinkedIn posts?', a: 'Paste the blog (or podcast notes / newsletter) into PersonaLink and the repurpose engine pulls out the strongest angles and writes each as a standalone LinkedIn post in your voice — a counterpoint, a deep-dive, a behind-the-scenes, and more.' },
  { q: 'How many posts can I get from one piece?', a: 'Typically three to five distinct angles from a single source, each genuinely different rather than a reword of the same point.' },
  { q: 'Will the repurposed posts sound repetitive?', a: 'No — each is written to a different angle and constrained to your voice fingerprint, so it reads like a fresh take, not a copy-paste.' },
  { q: 'Can I reuse a post that did well?', a: 'Yes. Feed a past winner back in and the engine mines new angles from it, so a good idea earns more than one post.' },
]

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    { '@type': 'SoftwareApplication', name: 'PersonaLink — Repurpose Engine', applicationCategory: 'BusinessApplication', operatingSystem: 'Web', description: 'Turn one post or a blog/podcast/newsletter into several LinkedIn posts in your voice.', url: URL, offers: { '@type': 'AggregateOffer', lowPrice: '999', highPrice: '4999', priceCurrency: 'INR', offerCount: 3, availability: 'https://schema.org/InStock' } },
    { '@type': 'BreadcrumbList', itemListElement: [ { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://personalink.in' }, { '@type': 'ListItem', position: 2, name: 'Features', item: 'https://personalink.in/features' }, { '@type': 'ListItem', position: 3, name: 'Repurpose engine', item: URL } ] },
    { '@type': 'FAQPage', mainEntity: FAQS.map(({ q, a }) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
  ],
}

const wrap = { maxWidth: 820, margin: '0 auto', padding: '0 clamp(16px,4vw,32px)' } as const
const eyebrow = { fontFamily: 'var(--f-mono)', fontSize: 12, letterSpacing: '0.06em', color: 'var(--pl-accent)', textTransform: 'uppercase' as const, marginBottom: 14 }
const h2 = { fontFamily: 'var(--f-sans)', fontWeight: 700, fontSize: 'clamp(22px,3.2vw,30px)', letterSpacing: '-0.03em', color: 'var(--ink)', margin: '0 0 14px' }
const p = { fontSize: 16, lineHeight: 1.7, color: 'var(--ink-3)', margin: '0 0 16px' }
const section = { padding: 'clamp(32px,5vw,52px) 0', borderTop: '1px solid var(--line)' }

export default function RepurposeEnginePage() {
  return (
    <LandingShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <section style={{ ...wrap, padding: 'clamp(48px,8vw,84px) clamp(16px,4vw,32px) clamp(20px,4vw,36px)' }}>
        <div style={eyebrow}>Feature · Repurpose</div>
        <h1 style={{ fontFamily: 'var(--f-sans)', fontWeight: 700, fontSize: 'clamp(28px,5vw,46px)', letterSpacing: '-0.04em', lineHeight: 1.12, color: 'var(--ink)', margin: '0 0 18px' }}>
          One post, five formats: the LinkedIn repurpose engine
        </h1>
        <p style={{ ...p, fontSize: 18, maxWidth: 660 }}>When something lands, PersonaLink mines it for fresh angles — a counterpoint, a deeper take, a behind-the-scenes — each written as a new post in your voice.</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 8 }}>
          <Link href="/voice-analyzer" style={{ background: 'var(--ink)', color: 'var(--bg)', padding: '13px 22px', borderRadius: 'var(--r-md)', fontWeight: 600, fontSize: 15, textDecoration: 'none' }}>Analyze my voice — free</Link>
          <Link href="/pricing" style={{ color: 'var(--ink)', padding: '13px 22px', borderRadius: 'var(--r-md)', fontWeight: 600, fontSize: 15, textDecoration: 'none', border: '1px solid var(--line)' }}>Pricing from ₹999</Link>
        </div>
      </section>
      <section style={{ background: 'var(--surface-2)' }}><div style={{ ...wrap, ...section }}>
        <div style={eyebrow}>The myth</div>
        <h2 style={h2}>You’re not out of ideas — you’re under-using the ones you have</h2>
        <p style={p}>Most people post an idea once and move on. But a single good insight contains a counterpoint, a deeper explanation, a real example and a lesson. The repurpose engine surfaces those angles so one idea becomes a week of posts.</p>
      </div></section>
      <section style={{ ...wrap, ...section }}>
        <div style={eyebrow}>Sources</div>
        <h2 style={h2}>From a blog, podcast or newsletter → LinkedIn</h2>
        <p style={p}>Already write long-form? Paste a blog, podcast transcript or newsletter and the engine turns it into native LinkedIn posts — not link-dumps. Pairs with <Link href="/features/voice-to-post" style={{ color: 'var(--pl-accent)' }}>voice-to-post</Link> and the <Link href="/blog/linkedin-content-ideas-india" style={{ color: 'var(--pl-accent)' }}>India content-ideas guide</Link>.</p>
      </section>
      <section style={{ background: 'var(--surface-2)' }}><div style={{ ...wrap, ...section }}>
        <h2 style={h2}>FAQ</h2>
        <div style={{ marginTop: 8 }}>{FAQS.map((f) => (<details key={f.q} style={{ borderBottom: '1px solid var(--line)' }}><summary style={{ padding: '15px 0', cursor: 'pointer', fontWeight: 600, fontSize: 15.5, color: 'var(--ink)', listStyle: 'none' }}>{f.q}</summary><div style={{ paddingBottom: 15, fontSize: 14.5, lineHeight: 1.7, color: 'var(--ink-4)' }}>{f.a}</div></details>))}</div>
        <div style={{ marginTop: 26 }}><Link href="/voice-analyzer" style={{ background: 'var(--ink)', color: 'var(--bg)', padding: '13px 22px', borderRadius: 'var(--r-md)', fontWeight: 600, fontSize: 15, textDecoration: 'none' }}>Try it free</Link></div>
      </div></section>
    </LandingShell>
  )
}
