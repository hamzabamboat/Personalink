import type { Metadata } from 'next'
import Link from 'next/link'
import { LandingShell } from '@/components/landing/LandingShell'

const URL = 'https://personalink.in/blog/linkedin-carousel-maker'

export const metadata: Metadata = {
  title: 'How to Make a LinkedIn Carousel in 2026 (Free, In Your Brand)',
  description:
    'A step-by-step guide to making LinkedIn carousels — the right slide size, how many slides, how to export a document PDF, and how to do it in your brand without InDesign.',
  keywords: ['LinkedIn carousel maker', 'how to make a LinkedIn carousel', 'LinkedIn carousel size', 'LinkedIn document post', 'LinkedIn PDF carousel'],
  alternates: { canonical: URL },
  openGraph: { type: 'article', locale: 'en_IN', url: URL, siteName: 'PersonaLink', title: 'How to Make a LinkedIn Carousel in 2026 (Free, In Your Brand)', description: 'Slide size, slide count, exporting a document PDF, and doing it on-brand.', images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'How to make a LinkedIn carousel' }] },
  twitter: { card: 'summary_large_image', title: 'How to Make a LinkedIn Carousel', description: 'Slide size, slide count, the PDF export, and doing it on-brand.', images: ['/og-image.png'] },
}

const FAQS = [
  { q: 'What size should a LinkedIn carousel be?', a: 'Portrait 1080×1350 (4:5) is the best choice — it fills the most of a phone screen. You upload it as a PDF “document” post, and LinkedIn turns each page into a swipeable slide.' },
  { q: 'How many slides should a LinkedIn carousel have?', a: 'Six to ten is the sweet spot: a cover, four to eight body slides, and a closing call-to-action. Fewer than four feels thin; more than ten and people swipe away before the payoff.' },
  { q: 'How do I post a carousel on LinkedIn?', a: 'Export your slides as a single PDF, then on LinkedIn click “Add a document”, upload the PDF, give it a title, and publish. LinkedIn renders it as a swipeable carousel in the feed.' },
]

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    { '@type': 'Article', headline: 'How to Make a LinkedIn Carousel in 2026 (Free, In Your Brand)', description: 'Slide size, slide count, exporting a document PDF, and doing it on-brand.', image: 'https://personalink.in/og-image.png', datePublished: '2026-06-12', dateModified: '2026-06-12', inLanguage: 'en-IN', author: { '@type': 'Organization', name: 'PersonaLink Team', url: 'https://personalink.in' }, publisher: { '@type': 'Organization', name: 'PersonaLink', url: 'https://personalink.in', logo: { '@type': 'ImageObject', url: 'https://personalink.in/logo.png' } }, mainEntityOfPage: { '@type': 'WebPage', '@id': URL }, articleSection: 'LinkedIn Growth' },
    { '@type': 'BreadcrumbList', itemListElement: [ { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://personalink.in' }, { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://personalink.in/blog' }, { '@type': 'ListItem', position: 3, name: 'How to Make a LinkedIn Carousel', item: URL } ] },
    { '@type': 'FAQPage', mainEntity: FAQS.map(({ q, a }) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
  ],
}

const aw = { maxWidth: 720, margin: '0 auto', padding: 'clamp(40px,7vw,72px) clamp(16px,4vw,24px)' } as const
const H1s = { fontSize: 'clamp(28px,5vw,44px)', fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.03em', lineHeight: 1.12, margin: '0 0 18px' } as const
const H2 = { fontSize: 'clamp(20px,3vw,28px)', fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.02em', margin: '38px 0 12px' } as const
const P = { fontSize: 17, lineHeight: 1.75, color: 'var(--ink-2)', margin: '0 0 16px' } as const
const OL = { margin: '0 0 18px', paddingLeft: 22, color: 'var(--ink-2)', fontSize: 16.5, lineHeight: 1.8 } as const
const link = { color: 'var(--pl-accent)' } as const

const STEPS = [
  'Start from one strong idea — a lesson, a framework, a myth to bust. One idea per carousel.',
  'Write a cover slide that promises a payoff (“5 mistakes that killed my first launch”).',
  'Break the idea into one point per slide. Short headline, one or two supporting lines. No walls of text.',
  'Design each slide at 1080×1350, in consistent colours and one font, with your logo small in the corner.',
  'End with a call-to-action slide — follow, comment, or a link.',
  'Export all slides as a single PDF and upload it as a “document” post.',
]

export default function Page() {
  return (
    <LandingShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <article style={aw}>
        <div style={{ fontFamily: 'var(--f-mono)', fontSize: 12, color: 'var(--ink-4)', marginBottom: 12 }}>LinkedIn Growth · 6 min read</div>
        <h1 style={H1s}>How to make a LinkedIn carousel (free, in your brand)</h1>
        <p style={P}>Carousels are one of the most engaging formats on LinkedIn — they’re swipeable, they hold attention, and LinkedIn gives them a dedicated document viewer. The catch has always been making them: most guides send you to InDesign or a fiddly slide template. Here’s the faster way.</p>

        <h2 style={H2}>What a LinkedIn carousel actually is</h2>
        <p style={P}>A “carousel” on LinkedIn is just a <strong>PDF uploaded as a document post</strong>. Each page becomes a swipeable slide. That means the whole job is: make good slides, export one PDF, upload it.</p>

        <h2 style={H2}>The right size and slide count</h2>
        <p style={P}>Build slides at <strong>1080×1350 (portrait 4:5)</strong> — it fills the most of a phone screen. Aim for <strong>6–10 slides</strong>: a cover, a handful of body slides with one point each, and a closing call-to-action.</p>

        <h2 style={H2}>Make one in six steps</h2>
        <ol style={OL}>{STEPS.map((s) => <li key={s}>{s}</li>)}</ol>

        <h2 style={H2}>The shortcut: generate it on-brand</h2>
        <p style={P}>Designing eight slides by hand is the slow part. <Link href="/ai-linkedin-automation-tool" style={link}>PersonaLink</Link> takes a topic or an existing post, writes the carousel copy in your voice, lays out every slide in your brand colours, logo and font, and hands you a ready-to-upload PDF — so the only manual step left is hitting “Add a document” on LinkedIn.</p>

        <h2 style={H2}>A few rules that make carousels work</h2>
        <p style={P}>One idea per carousel. One point per slide. A cover that promises something specific. Consistent colours so it reads as <em>yours</em>. And a real call-to-action at the end — the swipe-through is wasted if you don’t tell people what to do next.</p>

        <h2 style={H2}>FAQ</h2>
        {FAQS.map((f) => (
          <details key={f.q} style={{ borderBottom: '1px solid var(--line)' }}>
            <summary style={{ padding: '15px 0', cursor: 'pointer', fontWeight: 600, fontSize: 16, color: 'var(--ink)', listStyle: 'none' }}>{f.q}</summary>
            <div style={{ paddingBottom: 15, fontSize: 15, lineHeight: 1.7, color: 'var(--ink-4)' }}>{f.a}</div>
          </details>
        ))}
        <p style={{ ...P, marginTop: 24 }}>Related: <Link href="/blog/how-to-add-images-to-linkedin-posts" style={link}>how to add images to LinkedIn posts</Link> and <Link href="/blog/linkedin-banner-size-generator" style={link}>the right LinkedIn banner size</Link>.</p>
        <div style={{ marginTop: 20 }}><Link href="/" style={{ background: 'var(--ink)', color: 'var(--bg)', padding: '13px 22px', borderRadius: 'var(--r-md)', fontWeight: 600, fontSize: 15, textDecoration: 'none' }}>Make a carousel in your brand →</Link></div>
      </article>
    </LandingShell>
  )
}
