import type { Metadata } from 'next'
import Link from 'next/link'
import { LandingShell } from '@/components/landing/LandingShell'

const URL = 'https://personalink.in/blog/linkedin-quote-card-generator'

export const metadata: Metadata = {
  title: 'Free LinkedIn Quote Card Generator (No Watermark, No Signup)',
  description:
    'Turn a line into a clean LinkedIn quote card in your colours — free, no watermark, no signup. Plus when to use quote, stat and list cards, and the right size.',
  keywords: ['LinkedIn quote card generator', 'free quote card maker', 'LinkedIn quote graphic', 'quote card for LinkedIn', 'LinkedIn stat card'],
  alternates: { canonical: URL },
  openGraph: { type: 'article', locale: 'en_IN', url: URL, siteName: 'PersonaLink', title: 'Free LinkedIn Quote Card Generator (No Watermark, No Signup)', description: 'Turn a line into a clean quote card in your colours — free, no watermark.', images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Free LinkedIn quote card generator' }] },
  twitter: { card: 'summary_large_image', title: 'Free LinkedIn Quote Card Generator', description: 'A line into a clean quote card in your colours — free, no watermark.', images: ['/og-image.png'] },
}

const FAQS = [
  { q: 'Is the quote card generator really free?', a: 'Yes — you can make and download quote, stat, title and list cards with no signup and no watermark. It’s a free tool; the paid product adds your saved brand kit, AI-written copy, carousels and posting.' },
  { q: 'What size is a LinkedIn quote card?', a: 'Square 1080×1080 or portrait 1080×1350 both work well in the feed. Portrait takes up more of a phone screen, so it’s the stronger default for a text card.' },
  { q: 'When should I use a quote card vs a stat card?', a: 'Use a quote card when a single sentence is the whole point — a sharp line or takeaway. Use a stat card when one number is the hook. List and title cards work for “3 ways to…” style posts.' },
]

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    { '@type': 'Article', headline: 'Free LinkedIn Quote Card Generator (No Watermark, No Signup)', description: 'Turn a line into a clean quote card in your colours — free, no watermark.', image: 'https://personalink.in/og-image.png', datePublished: '2026-06-12', dateModified: '2026-06-12', inLanguage: 'en-IN', author: { '@type': 'Organization', name: 'PersonaLink Team', url: 'https://personalink.in' }, publisher: { '@type': 'Organization', name: 'PersonaLink', url: 'https://personalink.in', logo: { '@type': 'ImageObject', url: 'https://personalink.in/logo.png' } }, mainEntityOfPage: { '@type': 'WebPage', '@id': URL }, articleSection: 'LinkedIn Growth' },
    { '@type': 'BreadcrumbList', itemListElement: [ { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://personalink.in' }, { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://personalink.in/blog' }, { '@type': 'ListItem', position: 3, name: 'Free LinkedIn Quote Card Generator', item: URL } ] },
    { '@type': 'FAQPage', mainEntity: FAQS.map(({ q, a }) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
  ],
}

const aw = { maxWidth: 720, margin: '0 auto', padding: 'clamp(40px,7vw,72px) clamp(16px,4vw,24px)' } as const
const H1s = { fontSize: 'clamp(28px,5vw,44px)', fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.03em', lineHeight: 1.12, margin: '0 0 18px' } as const
const H2 = { fontSize: 'clamp(20px,3vw,28px)', fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.02em', margin: '38px 0 12px' } as const
const P = { fontSize: 17, lineHeight: 1.75, color: 'var(--ink-2)', margin: '0 0 16px' } as const
const UL = { margin: '0 0 18px', paddingLeft: 22, color: 'var(--ink-2)', fontSize: 16.5, lineHeight: 1.8 } as const
const link = { color: 'var(--pl-accent)' } as const

export default function Page() {
  return (
    <LandingShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <article style={aw}>
        <div style={{ fontFamily: 'var(--f-mono)', fontSize: 12, color: 'var(--ink-4)', marginBottom: 12 }}>LinkedIn Growth · 4 min read</div>
        <h1 style={H1s}>Free LinkedIn quote card generator (no watermark, no signup)</h1>
        <p style={P}>Sometimes one line is the whole post. A clean quote card makes that line stop the scroll — and you shouldn’t need a design tool or a paid subscription to make one. Here’s how to do it free, plus when each card type works best.</p>

        <h2 style={H2}>Make one free, right now</h2>
        <p style={P}>The <Link href="/tools/card-generator" style={link}>free LinkedIn card generator</Link> turns a line into a polished card in your chosen colour — no signup, no watermark, download as a PNG. Paste your line, pick a template and a colour, and you’re done.</p>

        <h2 style={H2}>The four card types (and when to use them)</h2>
        <ul style={UL}>
          <li><strong>Quote card</strong> — when a single sentence is the point. A sharp line, a takeaway, a principle.</li>
          <li><strong>Stat card</strong> — when one number is the hook. Big figure, short label.</li>
          <li><strong>List card</strong> — for “3 ways to…” or “5 mistakes…” posts. Scannable and saveable.</li>
          <li><strong>Title card</strong> — a bold headline for an announcement or a cover.</li>
        </ul>

        <h2 style={H2}>What makes a card actually good</h2>
        <p style={P}>Less text than you think. One idea, big type, high contrast, and your colour used with restraint. A quote card with three sentences isn’t a card — it’s a paragraph with a border. Cut it to the one line that matters.</p>

        <h2 style={H2}>From free tool to on-brand system</h2>
        <p style={P}>The free generator is great for a one-off. If you’re posting regularly, the slow part isn’t the card — it’s doing it consistently. <Link href="/ai-linkedin-automation-tool" style={link}>PersonaLink</Link> saves your brand kit (colour, logo, font) and turns any post into a branded card in a click — unlimited, watermark-free — so every graphic looks like it came from the same brand. It also writes the post in your voice first, then makes the visual.</p>

        <h2 style={H2}>FAQ</h2>
        {FAQS.map((f) => (
          <details key={f.q} style={{ borderBottom: '1px solid var(--line)' }}>
            <summary style={{ padding: '15px 0', cursor: 'pointer', fontWeight: 600, fontSize: 16, color: 'var(--ink)', listStyle: 'none' }}>{f.q}</summary>
            <div style={{ paddingBottom: 15, fontSize: 15, lineHeight: 1.7, color: 'var(--ink-4)' }}>{f.a}</div>
          </details>
        ))}
        <p style={{ ...P, marginTop: 24 }}>Related: <Link href="/blog/how-to-add-images-to-linkedin-posts" style={link}>how to add images to LinkedIn posts</Link> and <Link href="/blog/linkedin-post-templates-that-work" style={link}>LinkedIn post templates that work</Link>.</p>
        <div style={{ marginTop: 20 }}><Link href="/tools/card-generator" style={{ background: 'var(--ink)', color: 'var(--bg)', padding: '13px 22px', borderRadius: 'var(--r-md)', fontWeight: 600, fontSize: 15, textDecoration: 'none' }}>Make a free quote card →</Link></div>
      </article>
    </LandingShell>
  )
}
