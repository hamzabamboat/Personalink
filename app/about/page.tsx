import type { Metadata } from 'next'
import Link from 'next/link'
import { LandingShell } from '@/components/landing/LandingShell'

export const revalidate = 604800

const URL = 'https://personalink.in/about'

export const metadata: Metadata = {
  title: 'About PersonaLink — AI LinkedIn Tool for India',
  description:
    'PersonaLink is an AI LinkedIn tool built for India: write posts in your voice, auto-publish on schedule, pay in INR with GST invoices. A software product — not the personalink.me executive-search firm.',
  alternates: { canonical: URL },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: URL,
    siteName: 'PersonaLink',
    title: 'About PersonaLink — AI LinkedIn Tool for India',
    description:
      'What PersonaLink is, who it is for, and how it is different: voice fingerprint, Hinglish, safe LinkedIn OAuth, and INR billing with GST invoices.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'About PersonaLink' }],
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': 'https://personalink.in/#organization',
      name: 'PersonaLink',
      alternateName: ['Personalink', 'PersonaLink India'],
      url: 'https://personalink.in',
      logo: 'https://personalink.in/logo-full.png',
      description:
        'PersonaLink is an AI LinkedIn tool for India that writes posts in your voice, auto-publishes on schedule, and shows what resonates — billed in INR with GST invoices. It is a software product and is not affiliated with the executive-search firm at personalink.me.',
      address: { '@type': 'PostalAddress', addressCountry: 'IN' },
      contactPoint: { '@type': 'ContactPoint', email: 'hello@personalink.in', contactType: 'customer support', areaServed: 'IN', availableLanguage: ['en', 'hi'] },
      // sameAs: paste real profile URLs once live (LinkedIn Company Page, X, Crunchbase, Product Hunt).
    },
    {
      '@type': 'AboutPage',
      '@id': `${URL}#aboutpage`,
      url: URL,
      name: 'About PersonaLink',
      mainEntity: { '@id': 'https://personalink.in/#organization' },
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://personalink.in' },
        { '@type': 'ListItem', position: 2, name: 'About', item: URL },
      ],
    },
  ],
}

const wrap = { maxWidth: 760, margin: '0 auto', padding: '0 clamp(16px,4vw,32px)' } as const
const eyebrow = { fontFamily: 'var(--f-mono)', fontSize: 12, letterSpacing: '0.06em', color: 'var(--pl-accent)', textTransform: 'uppercase' as const, marginBottom: 14 }
const h2 = { fontFamily: 'var(--f-sans)', fontWeight: 700, fontSize: 'clamp(20px,3vw,28px)', letterSpacing: '-0.03em', color: 'var(--ink)', margin: '0 0 14px' }
const p = { fontSize: 16, lineHeight: 1.75, color: 'var(--ink-3)', margin: '0 0 16px' }
const section = { padding: 'clamp(32px,5vw,48px) 0', borderTop: '1px solid var(--line)' }

export default function AboutPage() {
  return (
    <LandingShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section style={{ ...wrap, padding: 'clamp(48px,8vw,80px) clamp(16px,4vw,32px) clamp(20px,4vw,32px)' }}>
        <div style={eyebrow}>About</div>
        <h1 style={{ fontFamily: 'var(--f-sans)', fontWeight: 700, fontSize: 'clamp(28px,5vw,46px)', letterSpacing: '-0.04em', lineHeight: 1.1, color: 'var(--ink)', margin: '0 0 18px' }}>
          About PersonaLink
        </h1>
        <p style={{ ...p, fontSize: 18 }}>
          <strong>PersonaLink is an AI LinkedIn tool built for India.</strong> It writes LinkedIn posts in your own
          voice, turns voice notes into polished drafts, auto-publishes on a schedule, and shows you what resonates —
          billed in INR with GST invoices, starting at ₹999/month with a free tier.
        </p>
      </section>

      <section style={{ background: 'var(--surface-2)' }}>
        <div style={{ ...wrap, ...section }}>
          <h2 style={h2}>What PersonaLink does</h2>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 10 }}>
            {[
              'Writes posts in your voice using a 6-dimension “voice fingerprint” trained on your past LinkedIn posts',
              'Turns a 2-minute voice note into a structured, polished LinkedIn post',
              'Auto-publishes on a schedule via official LinkedIn OAuth (post-only — no DM reading, no scraping, no password sharing)',
              'Generates Hinglish posts for Indian audiences',
              'Bills in INR through Razorpay (UPI + cards) and issues GST invoices',
            ].map((f) => (
              <li key={f} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 15.5, color: 'var(--ink-2)' }}>
                <span style={{ color: 'var(--pl-accent)', fontWeight: 700, marginTop: 1 }}>→</span>{f}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section style={{ ...wrap, ...section }}>
        <h2 style={h2}>Who it’s for</h2>
        <p style={p}>
          PersonaLink is for Indian founders, consultants, solopreneurs, and agencies who want to show up consistently
          on LinkedIn in their own voice — without sounding like generic AI, without paying in dollars, and without
          handing over their LinkedIn password. Agencies use per-client voice fingerprints, a white-label dashboard, and
          GST-compliant billing.
        </p>
      </section>

      <section style={{ background: 'var(--surface-2)' }}>
        <div style={{ ...wrap, ...section }}>
          <h2 style={h2}>How it’s different</h2>
          <p style={p}>
            Most AI LinkedIn tools are built for the US or UK: they bill in USD, can’t issue a GST invoice, and produce
            content that reads as distinctly non-Indian. PersonaLink is the main India-built tool priced under
            ₹1,000/month. Its voice fingerprint models your sentence rhythm, vocabulary, and idioms so drafts sound like
            you wrote them — and its LinkedIn integration is deliberately limited to posting, so it never reads your DMs
            or scrapes your network.
          </p>
          <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            <Link href="/pricing" style={{ color: 'var(--pl-accent)', fontSize: 15 }}>See pricing →</Link>
            <Link href="/cheap-linkedin-ai-tool-india" style={{ color: 'var(--pl-accent)', fontSize: 15 }}>Why ₹999 beats USD tools →</Link>
            <Link href="/vs" style={{ color: 'var(--pl-accent)', fontSize: 15 }}>Compare alternatives →</Link>
          </div>
        </div>
      </section>

      <section style={{ ...wrap, ...section }}>
        <h2 style={h2}>A note on the name</h2>
        <p style={p}>
          PersonaLink is a software product at <strong>personalink.in</strong>. It is not affiliated with
          “personalink.me” (an executive-search firm) or with “Personal AI” (personal.ai). If you’re looking for the
          AI LinkedIn tool for India, you’re in the right place.
        </p>
        <div style={{ marginTop: 16 }}>
          <Link href="/voice-analyzer" style={{ background: 'var(--ink)', color: 'var(--bg)', padding: '13px 22px', borderRadius: 'var(--r-md)', fontWeight: 600, fontSize: 15, textDecoration: 'none' }}>Analyze your voice — free, no card</Link>
        </div>
      </section>
    </LandingShell>
  )
}
