import type { Metadata } from 'next'
import Link from 'next/link'
import { LandingShell } from '@/components/landing/LandingShell'

const URL = 'https://personalink.in/blog/linkedin-content-ideas-india'

export const metadata: Metadata = {
  title: 'LinkedIn Content Ideas for Indian Professionals (2026)',
  description:
    '30+ LinkedIn content ideas for Indian founders, consultants and professionals — founder lessons, contrarian takes, behind-the-scenes, Hinglish stories and more.',
  keywords: ['LinkedIn content ideas India', 'LinkedIn post ideas India', 'what to post on LinkedIn India', 'LinkedIn content ideas for founders'],
  alternates: { canonical: URL },
  openGraph: { type: 'article', locale: 'en_IN', url: URL, siteName: 'PersonaLink', title: 'LinkedIn Content Ideas for Indian Professionals (2026)', description: '30+ ideas for Indian founders, consultants and professionals — including Hinglish angles.', images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'LinkedIn content ideas India' }] },
  twitter: { card: 'summary_large_image', title: 'LinkedIn Content Ideas for Indian Professionals (2026)', description: '30+ ideas for Indian founders and professionals.', images: ['/og-image.png'] },
}

const FAQS = [
  { q: 'What should I post on LinkedIn as an Indian professional?', a: 'Mix four things: lessons from your work, contrarian takes on your industry, behind-the-scenes of how you actually operate, and useful breakdowns. Adding a Hinglish personal story now and then helps you stand out from generic English corporate content.' },
  { q: 'How do I never run out of LinkedIn ideas?', a: 'Keep a running note of questions people ask you, mistakes you made, and opinions you hold. Each one is a post. A repurpose tool can also turn one good post into several fresh angles.' },
  { q: 'Do Hinglish posts work on LinkedIn in India?', a: 'For many Indian audiences, yes — a natural Hinglish post can feel more personal and stop the scroll better than formal English. Match it to your real voice rather than forcing it.' },
]

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    { '@type': 'Article', headline: 'LinkedIn Content Ideas for Indian Professionals (2026)', description: '30+ LinkedIn content ideas for Indian founders, consultants and professionals.', image: 'https://personalink.in/og-image.png', datePublished: '2026-06-08', dateModified: '2026-06-08', inLanguage: 'en-IN', author: { '@type': 'Organization', name: 'PersonaLink Team', url: 'https://personalink.in' }, publisher: { '@type': 'Organization', name: 'PersonaLink', url: 'https://personalink.in', logo: { '@type': 'ImageObject', url: 'https://personalink.in/logo.png' } }, mainEntityOfPage: { '@type': 'WebPage', '@id': URL }, articleSection: 'LinkedIn Growth' },
    { '@type': 'BreadcrumbList', itemListElement: [ { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://personalink.in' }, { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://personalink.in/blog' }, { '@type': 'ListItem', position: 3, name: 'LinkedIn Content Ideas India', item: URL } ] },
    { '@type': 'FAQPage', mainEntity: FAQS.map(({ q, a }) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
  ],
}

const aw = { maxWidth: 720, margin: '0 auto', padding: 'clamp(40px,7vw,72px) clamp(16px,4vw,24px)' } as const
const H1s = { fontSize: 'clamp(28px,5vw,44px)', fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.03em', lineHeight: 1.12, margin: '0 0 18px' } as const
const H2 = { fontSize: 'clamp(20px,3vw,28px)', fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.02em', margin: '38px 0 12px' } as const
const P = { fontSize: 17, lineHeight: 1.75, color: 'var(--ink-2)', margin: '0 0 16px' } as const
const UL = { margin: '0 0 18px', paddingLeft: 22, color: 'var(--ink-2)', fontSize: 16.5, lineHeight: 1.8 } as const
const link = { color: 'var(--pl-accent)' } as const

const GROUPS: ReadonlyArray<readonly [string, readonly string[]]> = [
  ['Lessons & stories', ['A mistake you made this year and what it cost you', 'The hardest decision you made as a founder/leader', 'Something you believed at the start of your career that turned out wrong', 'A small win that mattered more than it should have', 'A failure you’ve never posted about — and the lesson']],
  ['Contrarian takes', ['An industry “best practice” you think is wrong', 'A popular tool/process you quietly stopped using', 'Advice everyone gives that didn’t work for you', 'A trend you think is over-hyped in India specifically']],
  ['Behind the scenes', ['How you actually spend a workday', 'Your hiring bar, explained with a real example', 'A pricing/strategy decision and the reasoning behind it', 'What your first 10 customers/clients taught you']],
  ['Useful breakdowns', ['A framework you use, with one concrete example', 'How you’d explain your work to a 10-year-old', 'A “how to” for something people keep asking you', 'A teardown of a great (or terrible) example in your field']],
  ['India & Hinglish angles', ['A Hinglish personal story that English would flatten', 'Something specific about building/working in India', 'A “myth vs reality” about your industry in India', 'Advice for someone starting out in your field in India']],
]

export default function Page() {
  return (
    <LandingShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <article style={aw}>
        <div style={{ fontFamily: 'var(--f-mono)', fontSize: 12, color: 'var(--ink-4)', marginBottom: 12 }}>LinkedIn Growth · 6 min read</div>
        <h1 style={H1s}>LinkedIn content ideas for Indian professionals (2026)</h1>
        <p style={P}>The hardest part of LinkedIn isn’t writing — it’s deciding what to write about. Here are 30+ ideas mapped to what actually performs for Indian founders, consultants and professionals. Steal any of them, and put them in your own voice.</p>
        {GROUPS.map(([heading, ideas]) => (
          <div key={heading}>
            <h2 style={H2}>{heading}</h2>
            <ul style={UL}>{ideas.map((i) => <li key={i}>{i}</li>)}</ul>
          </div>
        ))}
        <h2 style={H2}>Turn one idea into a week of posts</h2>
        <p style={P}>You don’t need 30 ideas a month — you need to use each one fully. A single lesson contains a story, a contrarian angle, a how-to and a behind-the-scenes. The <Link href="/features/repurpose-engine" style={link}>repurpose engine</Link> mines those angles for you, and the <Link href="/hinglish-linkedin-post-generator" style={link}>Hinglish generator</Link> keeps the India ones sounding natural.</p>
        <h2 style={H2}>FAQ</h2>
        {FAQS.map((f) => (
          <details key={f.q} style={{ borderBottom: '1px solid var(--line)' }}>
            <summary style={{ padding: '15px 0', cursor: 'pointer', fontWeight: 600, fontSize: 16, color: 'var(--ink)', listStyle: 'none' }}>{f.q}</summary>
            <div style={{ paddingBottom: 15, fontSize: 15, lineHeight: 1.7, color: 'var(--ink-4)' }}>{f.a}</div>
          </details>
        ))}
        <div style={{ marginTop: 28 }}><Link href="/voice-analyzer" style={{ background: 'var(--ink)', color: 'var(--bg)', padding: '13px 22px', borderRadius: 'var(--r-md)', fontWeight: 600, fontSize: 15, textDecoration: 'none' }}>Write these in your voice — free analysis</Link></div>
      </article>
    </LandingShell>
  )
}
