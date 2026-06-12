import type { Metadata } from 'next'
import Link from 'next/link'
import { LandingShell } from '@/components/landing/LandingShell'

const URL = 'https://personalink.in/blog/how-to-add-images-to-linkedin-posts'

export const metadata: Metadata = {
  title: 'How to Add Images to LinkedIn Posts (Branded Graphics, No Canva)',
  description:
    'How to add images to LinkedIn posts that look designed — branded quote, stat and list cards in your colours, plus AI images and the right sizes for 2026.',
  keywords: ['how to add images to LinkedIn posts', 'LinkedIn post image size', 'branded graphics LinkedIn', 'LinkedIn quote card', 'LinkedIn image maker'],
  alternates: { canonical: URL },
  openGraph: { type: 'article', locale: 'en_IN', url: URL, siteName: 'PersonaLink', title: 'How to Add Images to LinkedIn Posts (Branded Graphics, No Canva)', description: 'Branded cards in your colours, AI images, and the right sizes — without a design tool.', images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'How to add images to LinkedIn posts' }] },
  twitter: { card: 'summary_large_image', title: 'How to Add Images to LinkedIn Posts', description: 'Branded cards, AI images and the right sizes — no Canva.', images: ['/og-image.png'] },
}

const FAQS = [
  { q: 'What size should a LinkedIn post image be?', a: 'For a single image in the feed, 1200×1200 (square) or 1200×1500 (portrait) takes up the most screen space on mobile and is the safest choice. Landscape 1200×627 works for link-style posts. Documents/carousels render as 1080×1350 pages.' },
  { q: 'Do I need Canva to make LinkedIn graphics?', a: 'No. For text-based graphics — quote, stat, list and title cards — a generator that renders them in your brand colours and logo is faster than a design tool, because there is nothing to lay out. You paste the post and pick a style.' },
  { q: 'Should every LinkedIn post have an image?', a: 'Not every post — text-only posts still perform well. But a clean visual helps stop the scroll on key posts, and consistency in your colours/logo builds recognition over time. Add one where it earns attention, not as a tax on every post.' },
]

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    { '@type': 'Article', headline: 'How to Add Images to LinkedIn Posts (Branded Graphics, No Canva)', description: 'Branded cards, AI images and the right sizes — without a design tool.', image: 'https://personalink.in/og-image.png', datePublished: '2026-06-12', dateModified: '2026-06-12', inLanguage: 'en-IN', author: { '@type': 'Organization', name: 'PersonaLink Team', url: 'https://personalink.in' }, publisher: { '@type': 'Organization', name: 'PersonaLink', url: 'https://personalink.in', logo: { '@type': 'ImageObject', url: 'https://personalink.in/logo.png' } }, mainEntityOfPage: { '@type': 'WebPage', '@id': URL }, articleSection: 'LinkedIn Growth' },
    { '@type': 'BreadcrumbList', itemListElement: [ { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://personalink.in' }, { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://personalink.in/blog' }, { '@type': 'ListItem', position: 3, name: 'How to Add Images to LinkedIn Posts', item: URL } ] },
    { '@type': 'FAQPage', mainEntity: FAQS.map(({ q, a }) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
  ],
}

const aw = { maxWidth: 720, margin: '0 auto', padding: 'clamp(40px,7vw,72px) clamp(16px,4vw,24px)' } as const
const H1s = { fontSize: 'clamp(28px,5vw,44px)', fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.03em', lineHeight: 1.12, margin: '0 0 18px' } as const
const H2 = { fontSize: 'clamp(20px,3vw,28px)', fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.02em', margin: '38px 0 12px' } as const
const P = { fontSize: 17, lineHeight: 1.75, color: 'var(--ink-2)', margin: '0 0 16px' } as const
const UL = { margin: '0 0 18px', paddingLeft: 22, color: 'var(--ink-2)', fontSize: 16.5, lineHeight: 1.8 } as const
const link = { color: 'var(--pl-accent)' } as const

const SIZES = [
  'Square — 1200×1200. The default. Maximum mobile real estate.',
  'Portrait — 1200×1500. Tallest allowed in-feed; great for quote and stat cards.',
  'Landscape — 1200×627. Best for link-style posts and wide visuals.',
  'Document / carousel page — 1080×1350. Used when you post a multi-slide PDF.',
]

export default function Page() {
  return (
    <LandingShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <article style={aw}>
        <div style={{ fontFamily: 'var(--f-mono)', fontSize: 12, color: 'var(--ink-4)', marginBottom: 12 }}>LinkedIn Growth · 6 min read</div>
        <h1 style={H1s}>How to add images to LinkedIn posts (branded graphics, no Canva)</h1>
        <p style={P}>A clean visual is the difference between a post that gets scrolled past and one that stops the thumb. The good news: you don’t need a designer or a Canva subscription. Here’s how to add images to LinkedIn posts that look intentional — in the right sizes, in your own brand.</p>

        <h2 style={H2}>The two kinds of LinkedIn image</h2>
        <p style={P}>Almost every image you’ll post is one of two types, and they’re made very differently:</p>
        <ul style={UL}>
          <li><strong>Branded text graphics</strong> — a quote, stat, list, title or myth-buster card. These are pure text + your brand, so the fastest way to make them is a generator, not a design canvas.</li>
          <li><strong>Photoreal images</strong> — a scene, object or concept. Stock libraries are generic; AI image generation now gives you something specific in seconds.</li>
        </ul>

        <h2 style={H2}>The right LinkedIn image sizes (2026)</h2>
        <ul style={UL}>{SIZES.map((s) => <li key={s}>{s}</li>)}</ul>
        <p style={P}>If you only remember one: <strong>square or portrait</strong> for in-feed images, because they take up more of a phone screen than landscape does.</p>

        <h2 style={H2}>The fastest way to make a branded card</h2>
        <p style={P}>For text graphics, skip the canvas. Paste your post into a card generator, pick a template (quote, stat, list), and it renders in your colours and logo — no layout, no fonts to fiddle with. Try it free, no signup, with the <Link href="/tools/card-generator" style={link}>LinkedIn quote-card generator</Link>.</p>

        <h2 style={H2}>Keep it on-brand automatically</h2>
        <p style={P}>The point of a graphic isn’t just to look nice once — it’s to become <em>recognisable</em>. Set your colour, logo and font once in a brand kit and every card, carousel and banner you generate inherits them, so your feed starts to look like a brand instead of a scrapbook. <Link href="/ai-linkedin-automation-tool" style={link}>PersonaLink</Link> does this end-to-end: it drafts the post in your voice, then turns it into a branded graphic in a click — unlimited, watermark-free.</p>

        <h2 style={H2}>What about AI images?</h2>
        <p style={P}>For photoreal visuals, an AI image beats trawling stock sites — describe what you want and you get something specific to your post. The one honest caveat: AI picks its own colours, so a generated photo can carry your logo but won’t match your exact brand palette the way a rendered card does. Use AI photos for concepts and scenes; use branded cards when the words are the point.</p>

        <h2 style={H2}>FAQ</h2>
        {FAQS.map((f) => (
          <details key={f.q} style={{ borderBottom: '1px solid var(--line)' }}>
            <summary style={{ padding: '15px 0', cursor: 'pointer', fontWeight: 600, fontSize: 16, color: 'var(--ink)', listStyle: 'none' }}>{f.q}</summary>
            <div style={{ paddingBottom: 15, fontSize: 15, lineHeight: 1.7, color: 'var(--ink-4)' }}>{f.a}</div>
          </details>
        ))}
        <p style={{ ...P, marginTop: 24 }}>Related: <Link href="/blog/linkedin-carousel-maker" style={link}>how to make a LinkedIn carousel</Link> and <Link href="/blog/linkedin-post-templates-that-work" style={link}>LinkedIn post templates that actually work</Link>.</p>
        <div style={{ marginTop: 20 }}><Link href="/tools/card-generator" style={{ background: 'var(--ink)', color: 'var(--bg)', padding: '13px 22px', borderRadius: 'var(--r-md)', fontWeight: 600, fontSize: 15, textDecoration: 'none' }}>Make a free branded card →</Link></div>
      </article>
    </LandingShell>
  )
}
