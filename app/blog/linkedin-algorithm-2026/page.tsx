import type { Metadata } from 'next'
import Link from 'next/link'
import { LandingShell } from '@/components/landing/LandingShell'

const URL = 'https://personalink.in/blog/linkedin-algorithm-2026'

export const metadata: Metadata = {
  title: 'The LinkedIn Algorithm in 2026: How Reach Actually Works',
  description:
    'What the 2026 LinkedIn feed rewards — dwell time, meaningful comments and genuine expertise — why engagement-bait is dead, and how to work with it (India view).',
  keywords: ['LinkedIn algorithm 2026', 'how the LinkedIn algorithm works', 'LinkedIn reach 2026', 'LinkedIn algorithm India'],
  alternates: { canonical: URL },
  openGraph: {
    type: 'article', locale: 'en_IN', url: URL, siteName: 'PersonaLink',
    title: 'The LinkedIn Algorithm in 2026: How Reach Actually Works',
    description: 'What the 2026 feed rewards, why engagement-bait is dead, and how to work with it — with notes for Indian audiences.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'The LinkedIn algorithm in 2026' }],
  },
  twitter: { card: 'summary_large_image', title: 'The LinkedIn Algorithm in 2026', description: 'What the 2026 feed rewards, why engagement-bait is dead, and how to work with it.', images: ['/og-image.png'] },
}

const FAQS = [
  { q: 'How does the LinkedIn algorithm work in 2026?', a: 'In broad terms, LinkedIn shows your post to a small slice of your network first, then expands reach based on early signals — especially dwell time (how long people actually read) and meaningful comments. Posts that demonstrate genuine expertise on a focused topic travel furthest; generic engagement-bait is suppressed.' },
  { q: 'Does engagement-bait still work on LinkedIn?', a: 'No. "Comment YES for the template", follow-for-follow, and pod comments are downranked — the feed reads the substance of comment threads now, so low-effort engagement signals low quality and can hurt reach rather than help it.' },
  { q: 'Do external links kill LinkedIn reach?', a: 'A link in the post body still tends to get less reach than native text, because it pulls people off-platform and lowers dwell time. The common workaround is to put the link in the first comment — but the bigger lever is making the post itself worth reading.' },
  { q: 'How often should I post to satisfy the algorithm?', a: 'Consistency beats volume. A sustainable two to four strong posts a week, with genuine replies in the first hour, almost always outperforms daily low-effort posting. Pick a cadence you can keep.' },
]

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    { '@type': 'Article', headline: 'The LinkedIn Algorithm in 2026: How Reach Actually Works', description: 'What the 2026 LinkedIn feed rewards, why engagement-bait is dead, and how to work with it — with notes for Indian audiences.', image: 'https://personalink.in/og-image.png', datePublished: '2026-06-10', dateModified: '2026-06-10', inLanguage: 'en-IN', author: { '@type': 'Organization', name: 'PersonaLink Team', url: 'https://personalink.in' }, publisher: { '@type': 'Organization', name: 'PersonaLink', url: 'https://personalink.in', logo: { '@type': 'ImageObject', url: 'https://personalink.in/logo.png' } }, mainEntityOfPage: { '@type': 'WebPage', '@id': URL }, articleSection: 'LinkedIn Growth' },
    { '@type': 'BreadcrumbList', itemListElement: [ { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://personalink.in' }, { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://personalink.in/blog' }, { '@type': 'ListItem', position: 3, name: 'The LinkedIn Algorithm in 2026', item: URL } ] },
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
        <div style={{ fontFamily: 'var(--f-mono)', fontSize: 12, color: 'var(--ink-4)', marginBottom: 12 }}>LinkedIn Growth · 7 min read</div>
        <h1 style={H1s}>The LinkedIn algorithm in 2026: how reach actually works</h1>
        <p style={P}>Every few months someone declares they&apos;ve &ldquo;cracked the LinkedIn algorithm.&rdquo; They haven&apos;t — but the broad mechanics are well understood, and in 2026 they reward something simpler than the hacks suggest: posts that are genuinely worth reading. Here&apos;s how the feed actually distributes reach, and how to work with it instead of against it.</p>

        <h2 style={H2}>What the 2026 feed optimises for</h2>
        <p style={P}>When you publish, LinkedIn shows the post to a small initial slice of your network. What happens next decides everything. The system watches a few signals — and the two that matter most are <strong>dwell time</strong> (how long people actually stop and read) and <strong>meaningful comments</strong> (real replies, not one-word reactions). Strong early signals expand reach to second- and third-degree connections; weak ones cap it.</p>
        <p style={P}>The throughline is <em>relevance and substance</em>. The feed increasingly tries to read what a post is actually about and whether it demonstrates real knowledge on a focused topic — so a specific, useful post to the right audience beats a broad post to everyone.</p>

        <h2 style={H2}>Why engagement-bait stopped working</h2>
        <p style={P}>The tactics that worked in 2021 now actively hurt you:</p>
        <ul style={UL}>
          <li>&ldquo;Comment YES and I&apos;ll send you the template&rdquo; — the feed reads comment threads now; a wall of one-word comments signals low quality.</li>
          <li>Engagement pods — coordinated, off-topic comments are easy to detect and discount.</li>
          <li>Follow-for-follow and reaction-farming — high volume, no substance, downranked.</li>
        </ul>
        <p style={P}>None of these create dwell time or genuine discussion, which is exactly what the system is trying to measure. If your posts get plenty of likes but no reach, this is often why — see <Link href="/blog/why-your-linkedin-posts-get-zero-engagement" style={link}>why your LinkedIn posts get zero engagement</Link>.</p>

        <h2 style={H2}>Dwell time is the real currency</h2>
        <p style={P}>Because dwell time matters so much, the format of the post is doing more work than the topic alone:</p>
        <ul style={UL}>
          <li><strong>A real hook</strong> in the first line — a specific claim or tension, not &ldquo;Here are 5 tips.&rdquo;</li>
          <li><strong>White space and short lines</strong> so the post is easy to read on a phone.</li>
          <li><strong>One idea, fully developed</strong> — depth holds attention; a list of shallow bullets doesn&apos;t.</li>
          <li><strong>Links in the first comment, not the body</strong> — a link in the post pulls people off-platform and lowers dwell time.</li>
        </ul>

        <h2 style={H2}>What it means for India specifically</h2>
        <p style={P}>Two India-specific notes. First, <strong>timing follows IST</strong>, not the US-centric &ldquo;best times&rdquo; most guides quote — your first slice of readers needs to be awake (see <Link href="/blog/best-time-to-post-linkedin-india" style={link}>the best time to post on LinkedIn in India</Link>). Second, <strong>authenticity travels</strong>: a natural Hinglish post from a real perspective often earns more genuine comments than polished corporate English, because it reads like a person rather than a press release.</p>

        <h2 style={H2}>How to actually work with it</h2>
        <ul style={UL}>
          <li>Post <strong>consistently</strong> at a cadence you can sustain — two to four strong posts a week beats daily filler.</li>
          <li>Lead with a real opinion or a specific story; vague &ldquo;value&rdquo; posts get scrolled past.</li>
          <li>Reply to every comment in the <strong>first hour</strong> — your replies are comments too, and they extend the post&apos;s life.</li>
          <li>Write like you, not like AI. The tells (em-dash overload, &ldquo;in today&apos;s landscape&rdquo;) cost you trust — an <Link href="/features/anti-ai-humanizer" style={link}>Anti-AI humanizer</Link> helps keep drafts sounding human.</li>
        </ul>

        <h2 style={H2}>The short version</h2>
        <p style={P}>You can&apos;t game the 2026 algorithm — but you don&apos;t need to. Write something specific and useful, format it to be read, post it when your audience is awake, and show up consistently in your own voice. If staying consistent is the hard part, that&apos;s exactly what <Link href="/ai-linkedin-automation-tool" style={link}>PersonaLink</Link> is for — it drafts in your voice and schedules around IST so you keep showing up. See <Link href="/pricing" style={link}>pricing</Link> (from ₹999/month).</p>

        <h2 style={H2}>FAQ</h2>
        {FAQS.map((f) => (
          <details key={f.q} style={{ borderBottom: '1px solid var(--line)' }}>
            <summary style={{ padding: '15px 0', cursor: 'pointer', fontWeight: 600, fontSize: 16, color: 'var(--ink)', listStyle: 'none' }}>{f.q}</summary>
            <div style={{ paddingBottom: 15, fontSize: 15, lineHeight: 1.7, color: 'var(--ink-4)' }}>{f.a}</div>
          </details>
        ))}

        <div style={{ marginTop: 28 }}><Link href="/voice-analyzer" style={{ background: 'var(--ink)', color: 'var(--bg)', padding: '13px 22px', borderRadius: 'var(--r-md)', fontWeight: 600, fontSize: 15, textDecoration: 'none' }}>Write posts worth reading — free voice analysis</Link></div>
      </article>
    </LandingShell>
  )
}
