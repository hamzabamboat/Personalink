import type { Metadata } from 'next'
import Link from 'next/link'
import { LandingShell } from '@/components/landing/LandingShell'

const URL = 'https://personalink.in/blog/linkedin-post-templates-that-work'

export const metadata: Metadata = {
  title: 'LinkedIn Post Templates That Actually Work (10 Proven Hooks)',
  description:
    '10 LinkedIn post templates and the hook patterns behind them — contrarian takes, vulnerable stories, data hooks and more — plus how to remix them in your own voice.',
  keywords: ['LinkedIn post templates', 'LinkedIn hooks', 'viral LinkedIn post templates', 'LinkedIn post ideas', 'LinkedIn content templates'],
  alternates: { canonical: URL },
  openGraph: { type: 'article', locale: 'en_IN', url: URL, siteName: 'PersonaLink', title: 'LinkedIn Post Templates That Actually Work (10 Proven Hooks)', description: '10 hook patterns behind posts that perform — and how to remix them in your voice.', images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'LinkedIn post templates that work' }] },
  twitter: { card: 'summary_large_image', title: 'LinkedIn Post Templates That Work', description: '10 proven hook patterns — and how to remix them in your voice.', images: ['/og-image.png'] },
}

const FAQS = [
  { q: 'Do LinkedIn templates make every post sound the same?', a: 'They can, if you paste them verbatim. A template should give you the structure — the hook and the shape — not the words. Fill it with your own story, in your own voice, and it reads as you.' },
  { q: 'What makes a LinkedIn hook work?', a: 'It creates a small tension the reader needs resolved: a belief flipped, a number that surprises, a confession that begs the lesson. The first line’s only job is to earn the second line.' },
  { q: 'Where can I find LinkedIn post templates?', a: 'Swipe files and template libraries are everywhere — the trick is using the pattern, not copying the post. PersonaLink has a built-in inspiration library of proven patterns you can remix in your own voice with one click.' },
]

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    { '@type': 'Article', headline: 'LinkedIn Post Templates That Actually Work (10 Proven Hooks)', description: '10 hook patterns behind posts that perform — and how to remix them in your voice.', image: 'https://personalink.in/og-image.png', datePublished: '2026-06-12', dateModified: '2026-06-12', inLanguage: 'en-IN', author: { '@type': 'Organization', name: 'PersonaLink Team', url: 'https://personalink.in' }, publisher: { '@type': 'Organization', name: 'PersonaLink', url: 'https://personalink.in', logo: { '@type': 'ImageObject', url: 'https://personalink.in/logo.png' } }, mainEntityOfPage: { '@type': 'WebPage', '@id': URL }, articleSection: 'LinkedIn Growth' },
    { '@type': 'BreadcrumbList', itemListElement: [ { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://personalink.in' }, { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://personalink.in/blog' }, { '@type': 'ListItem', position: 3, name: 'LinkedIn Post Templates That Work', item: URL } ] },
    { '@type': 'FAQPage', mainEntity: FAQS.map(({ q, a }) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
  ],
}

const aw = { maxWidth: 720, margin: '0 auto', padding: 'clamp(40px,7vw,72px) clamp(16px,4vw,24px)' } as const
const H1s = { fontSize: 'clamp(28px,5vw,44px)', fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.03em', lineHeight: 1.12, margin: '0 0 18px' } as const
const H2 = { fontSize: 'clamp(20px,3vw,28px)', fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.02em', margin: '38px 0 12px' } as const
const P = { fontSize: 17, lineHeight: 1.75, color: 'var(--ink-2)', margin: '0 0 16px' } as const
const link = { color: 'var(--pl-accent)' } as const
const card = { border: '1px solid var(--line)', borderRadius: 12, padding: '16px 18px', margin: '0 0 12px' } as const
const tmpl = { fontFamily: 'var(--f-mono)', fontSize: 13.5, lineHeight: 1.6, color: 'var(--ink-3)', whiteSpace: 'pre-wrap', margin: '8px 0 0' } as const

const TEMPLATES = [
  { name: '1. The contrarian take', why: 'Names the crowd’s belief, then flips it.', t: 'Everyone tells you to [common advice].\nI did the opposite. Here’s what happened: […]' },
  { name: '2. The vulnerable story', why: 'Real stakes buy attention; the lesson earns the reshare.', t: 'We almost [near-disaster] last [time].\nHere’s what it taught me: [principle].' },
  { name: '3. Numbered lessons', why: 'A counted promise the reader can finish.', t: '[N] things [experience] taught me:\n1. [Claim]. [Proof.] …' },
  { name: '4. Before / after', why: 'Two points in time; the gap does the persuading.', t: '[Time] ago: [start].\nToday: [now].\nWhat moved the needle: […]' },
  { name: '5. Myth vs reality', why: 'Instant contrast; positions you as the one who knows.', t: 'Myth: [the thing everyone repeats].\nReality: [what’s actually true].' },
  { name: '6. The data hook', why: 'A sharp number breaks the scroll pattern.', t: '[X]% of [group] do [thing].\nThe other [Y]% do this instead: […]' },
  { name: '7. Unpopular opinion', why: 'Signals risk; invites debate, which lifts reach.', t: 'Unpopular opinion: [take].\nAfter [experience], I’m convinced: [reason].' },
  { name: '8. Behind the scenes', why: 'Trades polish for access and trust.', t: 'What I don’t usually share:\n[the unglamorous reality behind a win].' },
  { name: '9. The framework', why: 'A named, repeatable system people save.', t: 'The [name] framework I use for [outcome]:\n1. [Step] — [why]. …' },
  { name: '10. The expensive mistake', why: 'A quantified cost makes the advice feel earned.', t: 'I wasted [time/money] doing [wrong thing].\nHere’s what I’d do differently: […]' },
]

export default function Page() {
  return (
    <LandingShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <article style={aw}>
        <div style={{ fontFamily: 'var(--f-mono)', fontSize: 12, color: 'var(--ink-4)', marginBottom: 12 }}>LinkedIn Growth · 7 min read</div>
        <h1 style={H1s}>LinkedIn post templates that actually work (10 proven hooks)</h1>
        <p style={P}>A blank page is the enemy of consistency. Templates fix that — but only if you use the <em>pattern</em>, not the words. Below are ten hook structures behind posts that consistently perform, why each one works, and a fill-in template for it. Copy the shape, never the sentences.</p>

        <h2 style={H2}>10 templates (and why they work)</h2>
        {TEMPLATES.map((x) => (
          <div key={x.name} style={card}>
            <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--ink)' }}>{x.name}</div>
            <div style={{ fontSize: 14, color: 'var(--ink-4)', marginTop: 2 }}>{x.why}</div>
            <p style={tmpl}>{x.t}</p>
          </div>
        ))}

        <h2 style={H2}>The mistake everyone makes</h2>
        <p style={P}>People copy a viral post word-for-word and wonder why it flops. The structure travels; the words don’t. A “5 lessons” post works because of the counted promise, not because of <em>those</em> five lessons. Bring your own story to the shape.</p>

        <h2 style={H2}>Remix a template in your own voice</h2>
        <p style={P}>The fastest way to use these is to feed the pattern into a writer that already knows your voice. <Link href="/ai-linkedin-automation-tool" style={link}>PersonaLink’s</Link> inspiration library has these patterns built in — pick one, hit <strong>“remix in my voice”</strong>, and it drafts a post on the template using your own rhythm, vocabulary and openings. You get the proven structure without the copy-paste sameness. It also learns from your own top posts over time, so the library gets more <em>you</em> the more you publish.</p>

        <h2 style={H2}>FAQ</h2>
        {FAQS.map((f) => (
          <details key={f.q} style={{ borderBottom: '1px solid var(--line)' }}>
            <summary style={{ padding: '15px 0', cursor: 'pointer', fontWeight: 600, fontSize: 16, color: 'var(--ink)', listStyle: 'none' }}>{f.q}</summary>
            <div style={{ paddingBottom: 15, fontSize: 15, lineHeight: 1.7, color: 'var(--ink-4)' }}>{f.a}</div>
          </details>
        ))}
        <p style={{ ...P, marginTop: 24 }}>Related: <Link href="/blog/why-your-linkedin-posts-get-zero-engagement" style={link}>why your LinkedIn posts get zero engagement</Link> and <Link href="/blog/how-to-add-images-to-linkedin-posts" style={link}>how to add images to LinkedIn posts</Link>.</p>
        <div style={{ marginTop: 20 }}><Link href="/" style={{ background: 'var(--ink)', color: 'var(--bg)', padding: '13px 22px', borderRadius: 'var(--r-md)', fontWeight: 600, fontSize: 15, textDecoration: 'none' }}>Remix a template in my voice →</Link></div>
      </article>
    </LandingShell>
  )
}
