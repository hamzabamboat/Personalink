import type { Metadata } from 'next'
import Link from 'next/link'
import { LandingShell } from '@/components/landing/LandingShell'

const URL = 'https://personalink.in/blog/linkedin-banner-size-generator'

export const metadata: Metadata = {
  title: 'LinkedIn Banner Size in 2026 (+ a Free Banner Generator)',
  description:
    'The correct LinkedIn banner size is 1584×396. Here’s what fits in the safe zone, what to put on it, and how to generate a professional banner in your brand — in HD.',
  keywords: ['LinkedIn banner size', 'LinkedIn banner generator', 'LinkedIn cover photo size', 'LinkedIn background photo', 'LinkedIn banner template'],
  alternates: { canonical: URL },
  openGraph: { type: 'article', locale: 'en_IN', url: URL, siteName: 'PersonaLink', title: 'LinkedIn Banner Size in 2026 (+ a Free Banner Generator)', description: 'The 1584×396 banner, the safe zone, what to put on it, and how to generate one in HD.', images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'LinkedIn banner size guide' }] },
  twitter: { card: 'summary_large_image', title: 'LinkedIn Banner Size (2026)', description: '1584×396, the safe zone, and a free generator.', images: ['/og-image.png'] },
}

const FAQS = [
  { q: 'What is the correct LinkedIn banner size?', a: 'The LinkedIn personal profile banner is 1584×396 pixels (a 4:1 ratio). Company page cover images are 1128×191. Upload at the exact size, or larger at the same ratio, so it stays sharp.' },
  { q: 'Where does the profile photo cover the banner?', a: 'On desktop your profile photo sits over the lower-left of the banner, and the headline text overlaps the bottom. Keep anything important — your name, key words — in the upper and right area, away from that lower-left corner.' },
  { q: 'What should I put on my LinkedIn banner?', a: 'Keep it simple: your name or brand, a one-line description of what you do, two or three keywords, and your logo or colour. A banner is a billboard, not a slide — one clear message beats five.' },
]

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    { '@type': 'Article', headline: 'LinkedIn Banner Size in 2026 (+ a Free Banner Generator)', description: 'The 1584×396 banner, the safe zone, what to put on it, and how to generate one in HD.', image: 'https://personalink.in/og-image.png', datePublished: '2026-06-12', dateModified: '2026-06-12', inLanguage: 'en-IN', author: { '@type': 'Organization', name: 'PersonaLink Team', url: 'https://personalink.in' }, publisher: { '@type': 'Organization', name: 'PersonaLink', url: 'https://personalink.in', logo: { '@type': 'ImageObject', url: 'https://personalink.in/logo.png' } }, mainEntityOfPage: { '@type': 'WebPage', '@id': URL }, articleSection: 'LinkedIn Growth' },
    { '@type': 'BreadcrumbList', itemListElement: [ { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://personalink.in' }, { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://personalink.in/blog' }, { '@type': 'ListItem', position: 3, name: 'LinkedIn Banner Size', item: URL } ] },
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
        <div style={{ fontFamily: 'var(--f-mono)', fontSize: 12, color: 'var(--ink-4)', marginBottom: 12 }}>LinkedIn Growth · 5 min read</div>
        <h1 style={H1s}>LinkedIn banner size in 2026 (+ a free banner generator)</h1>
        <p style={P}>Your banner is the biggest piece of real estate on your profile, and most people leave it on the default blue gradient. Fixing that is a five-minute win. Here’s the exact size, the safe zone to design within, and the fastest way to make one that looks designed.</p>

        <h2 style={H2}>The correct LinkedIn banner size</h2>
        <p style={P}>The personal profile banner is <strong>1584×396 pixels</strong> — a wide 4:1 ratio. Always export at that size (or a larger multiple of it) so it stays crisp on high-resolution screens. For company pages, the cover image is 1128×191.</p>

        <h2 style={H2}>Mind the safe zone</h2>
        <p style={P}>LinkedIn crops and overlays the banner differently on mobile and desktop, and your profile photo covers the lower-left on desktop. So:</p>
        <ul style={UL}>
          <li>Keep your name and key words in the <strong>upper and right</strong> portion.</li>
          <li>Leave the <strong>lower-left</strong> clear — your profile photo sits there.</li>
          <li>Don’t put anything critical right at the edges; mobile trims them.</li>
        </ul>

        <h2 style={H2}>What to put on it</h2>
        <p style={P}>One clear message. Your name or brand, a single line on what you do and who you help, two or three keywords, and your logo or brand colour. Resist the urge to cram — a banner is a billboard you glance at, not a slide you read.</p>

        <h2 style={H2}>Generate one in your brand — in HD</h2>
        <p style={P}>You don’t need Photoshop. <Link href="/ai-linkedin-automation-tool" style={link}>PersonaLink’s</Link> profile beautifier generates a professional 1584×396 banner from your name, designation, a tagline and a few keywords — in your brand colour, font and logo — and lets you download it in high resolution (rendered at 3× so it’s razor-sharp on any screen). Pick a theme, hit generate, download, done.</p>

        <h2 style={H2}>FAQ</h2>
        {FAQS.map((f) => (
          <details key={f.q} style={{ borderBottom: '1px solid var(--line)' }}>
            <summary style={{ padding: '15px 0', cursor: 'pointer', fontWeight: 600, fontSize: 16, color: 'var(--ink)', listStyle: 'none' }}>{f.q}</summary>
            <div style={{ paddingBottom: 15, fontSize: 15, lineHeight: 1.7, color: 'var(--ink-4)' }}>{f.a}</div>
          </details>
        ))}
        <p style={{ ...P, marginTop: 24 }}>Related: <Link href="/blog/how-to-add-images-to-linkedin-posts" style={link}>how to add images to LinkedIn posts</Link> and <Link href="/blog/linkedin-carousel-maker" style={link}>how to make a LinkedIn carousel</Link>.</p>
        <div style={{ marginTop: 20 }}><Link href="/" style={{ background: 'var(--ink)', color: 'var(--bg)', padding: '13px 22px', borderRadius: 'var(--r-md)', fontWeight: 600, fontSize: 15, textDecoration: 'none' }}>Generate my LinkedIn banner →</Link></div>
      </article>
    </LandingShell>
  )
}
