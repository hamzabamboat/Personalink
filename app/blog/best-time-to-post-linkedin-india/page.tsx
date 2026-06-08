import type { Metadata } from 'next'
import Link from 'next/link'
import { LandingShell } from '@/components/landing/LandingShell'

const URL = 'https://personalink.in/blog/best-time-to-post-linkedin-india'

export const metadata: Metadata = {
  title: 'Best Time to Post on LinkedIn in India (IST, 2026)',
  description:
    'Most “best time to post” advice is built on US data. Here’s what actually works for Indian audiences on IST in 2026 — and why consistency beats perfect timing.',
  keywords: ['best time to post on LinkedIn India', 'best time to post LinkedIn IST', 'when to post on LinkedIn India', 'LinkedIn posting times India'],
  alternates: { canonical: URL },
  openGraph: {
    type: 'article', locale: 'en_IN', url: URL, siteName: 'PersonaLink',
    title: 'The Best Time to Post on LinkedIn in India (IST, 2026)',
    description: 'What actually works for Indian audiences on IST — and why consistency beats perfect timing.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Best time to post on LinkedIn in India (IST)' }],
  },
  twitter: { card: 'summary_large_image', title: 'Best Time to Post on LinkedIn in India (IST, 2026)', description: 'What actually works for Indian audiences on IST — and why consistency beats timing.', images: ['/og-image.png'] },
}

const FAQS = [
  { q: 'What is the best time to post on LinkedIn in India?', a: 'For most Indian professional audiences, weekday mornings (roughly 8–10am IST) and the lunch window (around 12–1pm IST) tend to perform well, with Tuesday to Thursday usually the strongest days. But your own audience’s active hours matter more than any generic time — check your analytics and test.' },
  { q: 'Should I post on weekends in India?', a: 'For B2B and professional content, weekdays generally outperform weekends. Weekends can still work for lighter, personal, or creator content — test with your own audience rather than assuming.' },
  { q: 'Does posting time matter more than consistency?', a: 'No. A good post published consistently beats a perfectly-timed post you only publish occasionally. Pick a sustainable cadence first, then optimise timing within it.' },
  { q: 'How do I post at the right IST time without staying up?', a: 'Schedule it. PersonaLink lets you queue posts and auto-publishes them at your chosen IST times via LinkedIn’s official API, so you’re not tied to posting manually.' },
]

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    { '@type': 'Article', headline: 'The Best Time to Post on LinkedIn in India (IST, 2026)', description: 'What actually works for Indian audiences on IST — and why consistency beats perfect timing.', image: 'https://personalink.in/og-image.png', datePublished: '2026-06-08', dateModified: '2026-06-08', inLanguage: 'en-IN', author: { '@type': 'Organization', name: 'PersonaLink Team', url: 'https://personalink.in' }, publisher: { '@type': 'Organization', name: 'PersonaLink', url: 'https://personalink.in', logo: { '@type': 'ImageObject', url: 'https://personalink.in/logo.png' } }, mainEntityOfPage: { '@type': 'WebPage', '@id': URL }, articleSection: 'LinkedIn Growth' },
    { '@type': 'BreadcrumbList', itemListElement: [ { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://personalink.in' }, { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://personalink.in/blog' }, { '@type': 'ListItem', position: 3, name: 'Best Time to Post on LinkedIn in India', item: URL } ] },
    { '@type': 'FAQPage', mainEntity: FAQS.map(({ q, a }) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
  ],
}

const aw = { maxWidth: 720, margin: '0 auto', padding: 'clamp(40px,7vw,72px) clamp(16px,4vw,24px)' } as const
const H1s = { fontSize: 'clamp(28px,5vw,44px)', fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.03em', lineHeight: 1.12, margin: '0 0 18px' } as const
const H2 = { fontSize: 'clamp(20px,3vw,28px)', fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.02em', margin: '40px 0 14px' } as const
const P = { fontSize: 17, lineHeight: 1.75, color: 'var(--ink-2)', margin: '0 0 18px' } as const
const link = { color: 'var(--pl-accent)' } as const

export default function Page() {
  return (
    <LandingShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <article style={aw}>
        <div style={{ fontFamily: 'var(--f-mono)', fontSize: 12, color: 'var(--ink-4)', marginBottom: 12 }}>LinkedIn Growth · 7 min read</div>
        <h1 style={H1s}>The best time to post on LinkedIn in India (IST, 2026)</h1>
        <p style={P}>
          Search “best time to post on LinkedIn” and most of the advice you’ll find is built on <strong>US-timezone
          data</strong>. If your audience is in India, those windows are simply wrong — 9am EST is the middle of the
          night in IST. Here’s a more honest take for Indian audiences, and why the time of day matters less than people
          think.
        </p>

        <h2 style={H2}>Why timezone changes everything</h2>
        <p style={P}>
          LinkedIn shows your post to a first batch of your network shortly after you publish; early engagement then
          decides how far it spreads. So you want to publish when <em>your</em> people are awake and scrolling. For an
          India-based professional audience, that’s the IST working rhythm — not the US one most “best time” charts assume.
        </p>

        <h2 style={H2}>Windows that tend to work for IST audiences</h2>
        <p style={P}>These are widely-reported starting points, not guarantees — treat them as a hypothesis to test against your own analytics:</p>
        <ul style={{ margin: '0 0 18px', paddingLeft: 22, color: 'var(--ink-2)', fontSize: 17, lineHeight: 1.7 }}>
          <li><strong>Weekday mornings, ~8–10am IST</strong> — the commute / first-coffee scroll.</li>
          <li><strong>Lunch, ~12–1pm IST</strong> — a midday break in the feed.</li>
          <li><strong>Early evening, ~6–8pm IST</strong> — wind-down scrolling (better for lighter content).</li>
          <li><strong>Tuesday–Thursday</strong> are usually the strongest days for professional content.</li>
        </ul>
        <p style={P}>
          Avoid posting important B2B content very late at night or across the weekend unless your specific audience is
          active then — many Indian professional audiences aren’t.
        </p>

        <h2 style={H2}>Your audience beats any generic time</h2>
        <p style={P}>
          The single most reliable “best time” is whenever <em>your</em> followers are active. Check your LinkedIn
          analytics for when your past posts got early engagement, and lean into those windows. A niche audience
          (say, founders vs students) can skew hours quite a bit from the averages above.
        </p>

        <h2 style={H2}>Consistency beats perfect timing</h2>
        <p style={P}>
          Here’s the part most timing guides bury: a decent post published <strong>consistently</strong> will out-perform
          a perfectly-timed post you only manage once a month. Pick a cadence you can actually sustain, then optimise
          timing within it. If staying on schedule is the hard part, see{' '}
          <Link href="/blog/how-to-grow-linkedin-india-2026" style={link}>how to grow on LinkedIn in India</Link>.
        </p>

        <h2 style={H2}>How to hit the right IST time without staying up</h2>
        <p style={P}>
          You don’t need to be at your desk at 8am to post at 8am. <Link href="/ai-linkedin-automation-tool" style={link}>PersonaLink</Link>{' '}
          lets you queue posts and auto-publishes them at your chosen IST times through LinkedIn’s official API — so you
          can write when you’re inspired and still land in the feed at peak attention.
        </p>

        <h2 style={H2}>FAQ</h2>
        {FAQS.map((f) => (
          <details key={f.q} style={{ borderBottom: '1px solid var(--line)' }}>
            <summary style={{ padding: '15px 0', cursor: 'pointer', fontWeight: 600, fontSize: 16, color: 'var(--ink)', listStyle: 'none' }}>{f.q}</summary>
            <div style={{ paddingBottom: 15, fontSize: 15, lineHeight: 1.7, color: 'var(--ink-4)' }}>{f.a}</div>
          </details>
        ))}

        <div style={{ marginTop: 28 }}>
          <Link href="/voice-analyzer" style={{ background: 'var(--ink)', color: 'var(--bg)', padding: '13px 22px', borderRadius: 'var(--r-md)', fontWeight: 600, fontSize: 15, textDecoration: 'none' }}>Start posting consistently — free voice analysis</Link>
        </div>
      </article>
    </LandingShell>
  )
}
