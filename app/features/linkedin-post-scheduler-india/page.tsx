import type { Metadata } from 'next'
import Link from 'next/link'
import { LandingShell } from '@/components/landing/LandingShell'

const URL = 'https://personalink.in/features/linkedin-post-scheduler-india'

export const metadata: Metadata = {
  title: 'LinkedIn Post Scheduler India (IST) | PersonaLink',
  description:
    'Schedule and auto-publish LinkedIn posts on IST timing with PersonaLink. INR billing, GST invoices, best-time suggestions for Indian audiences — not just a US scheduler.',
  keywords: ['LinkedIn post scheduler India', 'schedule LinkedIn posts IST', 'LinkedIn auto publish India', 'LinkedIn scheduling tool INR'],
  alternates: { canonical: URL },
  openGraph: { type: 'website', locale: 'en_IN', url: URL, siteName: 'PersonaLink', title: 'LinkedIn Post Scheduler Built for India (and IST)', description: 'Schedule and auto-publish on IST timing. INR billing, GST invoices.', images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'LinkedIn post scheduler India' }] },
  twitter: { card: 'summary_large_image', title: 'LinkedIn Post Scheduler India (IST) | PersonaLink', description: 'Schedule & auto-publish on IST. INR billing, GST invoices.', images: ['/og-image.png'] },
}

const FAQS = [
  { q: 'Is there a LinkedIn scheduler built for India?', a: 'Yes. PersonaLink schedules and auto-publishes on IST timing, bills in INR with a GST invoice, and suggests posting windows for Indian audiences — rather than defaulting to US timezones like most schedulers.' },
  { q: 'Does it auto-publish or just remind me?', a: 'It auto-publishes via LinkedIn’s official API at your chosen time — or, if you prefer, it can hold for one-tap approval first. Your choice of three modes.' },
  { q: 'What is the best time to post on LinkedIn in India?', a: 'For most Indian professional audiences, weekday mornings (~8–10am IST) and lunch (~12–1pm IST) work well, Tuesday–Thursday strongest. Your own analytics matter more — see our IST timing guide.' },
  { q: 'Can I bulk-schedule a week of posts?', a: 'Yes — queue multiple posts and PersonaLink spaces them across your best IST slots.' },
]

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    { '@type': 'SoftwareApplication', name: 'PersonaLink — LinkedIn Post Scheduler (India)', applicationCategory: 'BusinessApplication', operatingSystem: 'Web', description: 'Schedule and auto-publish LinkedIn posts on IST timing. INR billing, GST invoices.', url: URL, offers: { '@type': 'AggregateOffer', lowPrice: '999', highPrice: '4999', priceCurrency: 'INR', offerCount: 3, availability: 'https://schema.org/InStock' } },
    { '@type': 'BreadcrumbList', itemListElement: [ { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://personalink.in' }, { '@type': 'ListItem', position: 2, name: 'Features', item: 'https://personalink.in/features' }, { '@type': 'ListItem', position: 3, name: 'LinkedIn post scheduler India', item: URL } ] },
    { '@type': 'FAQPage', mainEntity: FAQS.map(({ q, a }) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
  ],
}

const wrap = { maxWidth: 820, margin: '0 auto', padding: '0 clamp(16px,4vw,32px)' } as const
const eyebrow = { fontFamily: 'var(--f-mono)', fontSize: 12, letterSpacing: '0.06em', color: 'var(--pl-accent)', textTransform: 'uppercase' as const, marginBottom: 14 }
const h2 = { fontFamily: 'var(--f-sans)', fontWeight: 700, fontSize: 'clamp(22px,3.2vw,30px)', letterSpacing: '-0.03em', color: 'var(--ink)', margin: '0 0 14px' }
const p = { fontSize: 16, lineHeight: 1.7, color: 'var(--ink-3)', margin: '0 0 16px' }
const section = { padding: 'clamp(32px,5vw,52px) 0', borderTop: '1px solid var(--line)' }

export default function SchedulerIndiaPage() {
  return (
    <LandingShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <section style={{ ...wrap, padding: 'clamp(48px,8vw,84px) clamp(16px,4vw,32px) clamp(20px,4vw,36px)' }}>
        <div style={eyebrow}>Feature · Scheduler</div>
        <h1 style={{ fontFamily: 'var(--f-sans)', fontWeight: 700, fontSize: 'clamp(28px,5vw,46px)', letterSpacing: '-0.04em', lineHeight: 1.12, color: 'var(--ink)', margin: '0 0 18px' }}>
          A LinkedIn post scheduler built for India (and IST)
        </h1>
        <p style={{ ...p, fontSize: 18, maxWidth: 660 }}>Queue your posts and auto-publish them at peak IST attention via LinkedIn’s official API. Billed in INR, GST invoice included — not a US scheduler with the timezone changed.</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 8 }}>
          <Link href="/voice-analyzer" style={{ background: 'var(--ink)', color: 'var(--bg)', padding: '13px 22px', borderRadius: 'var(--r-md)', fontWeight: 600, fontSize: 15, textDecoration: 'none' }}>Start free</Link>
          <Link href="/blog/best-time-to-post-linkedin-india" style={{ color: 'var(--ink)', padding: '13px 22px', borderRadius: 'var(--r-md)', fontWeight: 600, fontSize: 15, textDecoration: 'none', border: '1px solid var(--line)' }}>Best time to post in India</Link>
        </div>
      </section>
      <section style={{ background: 'var(--surface-2)' }}><div style={{ ...wrap, ...section }}>
        <div style={eyebrow}>The gap</div>
        <h2 style={h2}>Why US schedulers get Indian timing wrong</h2>
        <p style={p}>Most schedulers default to US-timezone “best times.” 9am EST is the middle of the night in IST. PersonaLink schedules around your audience’s actual IST rhythm and suggests windows that fit Indian working patterns — then auto-publishes so you’re not posting manually at 8am.</p>
      </div></section>
      <section style={{ ...wrap, ...section }}>
        <div style={eyebrow}>Control</div>
        <h2 style={h2}>Auto-publish, approve, or suggest — your call</h2>
        <p style={p}>Pick <strong>Full Autopilot</strong> (we publish on schedule), <strong>Approve Before Posting</strong> (one-tap approval), or <strong>Suggest Only</strong> (we draft, you publish). All through official LinkedIn OAuth — posting permission only, no scraping. See <Link href="/ai-linkedin-automation-tool" style={{ color: 'var(--pl-accent)' }}>how the automation works</Link>.</p>
      </section>
      <section style={{ background: 'var(--surface-2)' }}><div style={{ ...wrap, ...section }}>
        <h2 style={h2}>FAQ</h2>
        <div style={{ marginTop: 8 }}>{FAQS.map((f) => (<details key={f.q} style={{ borderBottom: '1px solid var(--line)' }}><summary style={{ padding: '15px 0', cursor: 'pointer', fontWeight: 600, fontSize: 15.5, color: 'var(--ink)', listStyle: 'none' }}>{f.q}</summary><div style={{ paddingBottom: 15, fontSize: 14.5, lineHeight: 1.7, color: 'var(--ink-4)' }}>{f.a}</div></details>))}</div>
        <div style={{ marginTop: 26 }}><Link href="/pricing" style={{ background: 'var(--ink)', color: 'var(--bg)', padding: '13px 22px', borderRadius: 'var(--r-md)', fontWeight: 600, fontSize: 15, textDecoration: 'none' }}>See pricing — from ₹999</Link></div>
      </div></section>
    </LandingShell>
  )
}
