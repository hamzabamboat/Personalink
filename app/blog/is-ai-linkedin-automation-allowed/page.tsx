import type { Metadata } from 'next'
import Link from 'next/link'
import { LandingShell } from '@/components/landing/LandingShell'

const URL = 'https://personalink.in/blog/is-ai-linkedin-automation-allowed'

export const metadata: Metadata = {
  title: 'Is AI LinkedIn Automation Against the Rules? (2026)',
  description:
    'Is automating LinkedIn posts allowed? The honest answer: content automation via the official API is fine; scraping and DM/connection bots are what get accounts restricted.',
  keywords: ['is LinkedIn automation against ToS', 'is AI LinkedIn automation allowed', 'is automating LinkedIn posts safe', 'LinkedIn automation rules'],
  alternates: { canonical: URL },
  openGraph: { type: 'article', locale: 'en_IN', url: URL, siteName: 'PersonaLink', title: 'Is AI LinkedIn Automation Against the Rules? (2026)', description: 'Content automation via the official API is fine; scraping and DM bots are the risky kind.', images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Is AI LinkedIn automation allowed' }] },
  twitter: { card: 'summary_large_image', title: 'Is AI LinkedIn Automation Against the Rules?', description: 'Content automation = fine. Scraping/DM bots = risky. The honest breakdown.', images: ['/og-image.png'] },
}

const FAQS = [
  { q: 'Is it against LinkedIn’s rules to automate posts?', a: 'Publishing your own content on a schedule through LinkedIn’s official API (OAuth) is within LinkedIn’s terms. What violates them is automating connections, messages, profile-views and scraping — the “growth bot” behaviours.' },
  { q: 'Can I get banned for using an AI LinkedIn tool?', a: 'The risk comes from how a tool connects, not from AI itself. Tools that scrape your feed or automate outreach put your account at risk; tools that use the official posting API and only request posting permission do not.' },
  { q: 'How can I tell if a tool is safe?', a: 'Check whether it uses official LinkedIn OAuth and what permissions it requests. If it asks for your password, automates connection requests or DMs, or “logs in as you” to scrape — that’s the risky kind.' },
  { q: 'Is PersonaLink safe to use?', a: 'PersonaLink uses official LinkedIn OAuth and requests posting permission only. It never stores your password, never reads your DMs, and never automates connections or scraping.' },
]

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    { '@type': 'Article', headline: 'Is AI LinkedIn Automation Against the Rules? (2026)', description: 'Content automation via the official API is fine; scraping and DM/connection bots are what get accounts restricted.', image: 'https://personalink.in/og-image.png', datePublished: '2026-06-08', dateModified: '2026-06-08', inLanguage: 'en-IN', author: { '@type': 'Organization', name: 'PersonaLink Team', url: 'https://personalink.in' }, publisher: { '@type': 'Organization', name: 'PersonaLink', url: 'https://personalink.in', logo: { '@type': 'ImageObject', url: 'https://personalink.in/logo.png' } }, mainEntityOfPage: { '@type': 'WebPage', '@id': URL }, articleSection: 'LinkedIn' },
    { '@type': 'BreadcrumbList', itemListElement: [ { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://personalink.in' }, { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://personalink.in/blog' }, { '@type': 'ListItem', position: 3, name: 'Is AI LinkedIn Automation Allowed', item: URL } ] },
    { '@type': 'FAQPage', mainEntity: FAQS.map(({ q, a }) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
  ],
}

const aw = { maxWidth: 720, margin: '0 auto', padding: 'clamp(40px,7vw,72px) clamp(16px,4vw,24px)' } as const
const H1s = { fontSize: 'clamp(28px,5vw,44px)', fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.03em', lineHeight: 1.12, margin: '0 0 18px' } as const
const H2 = { fontSize: 'clamp(20px,3vw,28px)', fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.02em', margin: '38px 0 12px' } as const
const P = { fontSize: 17, lineHeight: 1.75, color: 'var(--ink-2)', margin: '0 0 16px' } as const
const link = { color: 'var(--pl-accent)' } as const

export default function Page() {
  return (
    <LandingShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <article style={aw}>
        <div style={{ fontFamily: 'var(--f-mono)', fontSize: 12, color: 'var(--ink-4)', marginBottom: 12 }}>LinkedIn · 5 min read</div>
        <h1 style={H1s}>Is AI LinkedIn automation against the rules?</h1>
        <p style={P}>It’s the question that stops most people from automating their LinkedIn — and the honest answer is: <strong>it depends entirely on what you’re automating.</strong> There’s a clear line, and most people don’t know where it is.</p>
        <h2 style={H2}>Two very different things both called “automation”</h2>
        <p style={P}><strong>Content automation</strong> means writing, scheduling and publishing your own posts. <strong>Outreach automation</strong> means firing off connection requests and DMs, viewing profiles, and scraping the feed at scale. They get lumped together, but LinkedIn treats them completely differently.</p>
        <h2 style={H2}>What LinkedIn’s terms actually target</h2>
        <p style={P}>LinkedIn’s rules are aimed at <em>scraping</em> and <em>automated engagement</em> — software that logs in as you, copies data, and automates connections or messages. That’s what risks restrictions. Publishing your own content through LinkedIn’s official API isn’t that.</p>
        <h2 style={H2}>Official API vs scrapers — the deciding factor</h2>
        <p style={P}>A tool that uses official LinkedIn <strong>OAuth</strong> and requests <strong>posting permission only</strong> operates inside the rules: it can publish for you, but it can’t read your DMs, touch your network, or store your password. A tool that asks for your password or “logs in as you” to automate growth is the risky kind. Ask which one you’re using.</p>
        <h2 style={H2}>How to stay safe</h2>
        <p style={P}>Use a tool that publishes via the official API, keep a human in the loop (approve posts), and don’t bolt on connection/DM bots. <Link href="/ai-linkedin-automation-tool" style={link}>PersonaLink</Link> is built this way — official OAuth, posting-only, with three approval modes so you stay in control.</p>
        <h2 style={H2}>FAQ</h2>
        {FAQS.map((f) => (
          <details key={f.q} style={{ borderBottom: '1px solid var(--line)' }}>
            <summary style={{ padding: '15px 0', cursor: 'pointer', fontWeight: 600, fontSize: 16, color: 'var(--ink)', listStyle: 'none' }}>{f.q}</summary>
            <div style={{ paddingBottom: 15, fontSize: 15, lineHeight: 1.7, color: 'var(--ink-4)' }}>{f.a}</div>
          </details>
        ))}
        <div style={{ marginTop: 28 }}><Link href="/pricing" style={{ background: 'var(--ink)', color: 'var(--bg)', padding: '13px 22px', borderRadius: 'var(--r-md)', fontWeight: 600, fontSize: 15, textDecoration: 'none' }}>See the safe, official-API tool</Link></div>
      </article>
    </LandingShell>
  )
}
