import type { Metadata } from 'next'
import Link from 'next/link'
import { LandingShell } from '@/components/landing/LandingShell'

const URL = 'https://personalink.in/ai-linkedin-automation-tool'

export const metadata: Metadata = {
  title: 'AI LinkedIn Automation Tool — In Your Voice | PersonaLink',
  description:
    'PersonaLink is an AI LinkedIn automation tool that writes, schedules and auto-publishes posts in your own voice. Content automation, not DM spam. INR pricing, GST invoices, Hinglish.',
  keywords: [
    'AI LinkedIn automation tool',
    'LinkedIn automation tool',
    'LinkedIn content automation',
    'automate LinkedIn posts AI',
    'AI LinkedIn post automation India',
  ],
  alternates: { canonical: URL },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: URL,
    siteName: 'PersonaLink',
    title: 'AI LinkedIn Automation Tool That Posts in Your Voice | PersonaLink',
    description:
      'Write, schedule and auto-publish LinkedIn posts in your own voice — content automation, not spammy outreach. Built for India: INR, GST invoices, Hinglish.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'PersonaLink — AI LinkedIn automation tool' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI LinkedIn Automation Tool — In Your Voice | PersonaLink',
    description: 'Write, schedule & auto-publish LinkedIn posts in your voice. Content automation, not DM spam. INR, GST, Hinglish.',
    images: ['/og-image.png'],
  },
}

const FAQS = [
  {
    q: 'Is this a LinkedIn outreach or DM automation tool?',
    a: 'No. PersonaLink automates your content — writing, scheduling and auto-publishing posts in your voice. It does not send connection requests or DMs and does not scrape profiles. That kind of outreach automation is what gets accounts restricted; content automation through the official API does not.',
  },
  {
    q: 'Will the posts sound like me or like generic AI?',
    a: 'Like you. During setup we build a voice fingerprint across six dimensions — sentence rhythm, vocabulary, openings, pet phrases, emotional register and punctuation — and our Anti-AI humanizer constrains every draft to that fingerprint so it does not read like ChatGPT.',
  },
  {
    q: 'Is automating LinkedIn posts against LinkedIn’s rules?',
    a: 'Publishing your own content on a schedule via LinkedIn’s official OAuth API is within LinkedIn’s terms. PersonaLink only requests posting permission — it never reads your DMs, never touches your network, and never stores your password. The risky tools are the ones that automate connections and messages by scraping; that is not what PersonaLink does.',
  },
  {
    q: 'Can I review posts before they go live?',
    a: 'Yes — choose one of three modes: Full Autopilot (we publish on schedule), Approve Before Posting (you get a one-tap approval), or Suggest Only (we draft, you publish manually). You always own the publish button.',
  },
  {
    q: 'How much does it cost?',
    a: 'There is a free tier (3 posts a month, no card). Paid plans start at ₹999/month (Starter), with Standard at ₹2,499 and Pro at ₹4,999 — all billed in INR with a GST invoice. See the pricing page for full details.',
  },
  {
    q: 'Does it work for Indian audiences and Hinglish?',
    a: 'Yes. PersonaLink is India-first: it writes natural code-mixed Hinglish, bills in INR, issues GST invoices, accepts UPI/Razorpay, and schedules around IST.',
  },
]

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      name: 'PersonaLink — AI LinkedIn Automation Tool',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      description:
        'AI LinkedIn automation tool that writes, schedules and auto-publishes posts in your own voice. Content automation, not outreach. INR billing, GST invoices, Hinglish.',
      url: URL,
      offers: { '@type': 'AggregateOffer', lowPrice: '999', highPrice: '4999', priceCurrency: 'INR', offerCount: 3, availability: 'https://schema.org/InStock' },
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://personalink.in' },
        { '@type': 'ListItem', position: 2, name: 'AI LinkedIn Automation Tool', item: URL },
      ],
    },
    {
      '@type': 'FAQPage',
      mainEntity: FAQS.map(({ q, a }) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
    },
  ],
}

const wrap = { maxWidth: 880, margin: '0 auto', padding: '0 clamp(16px,4vw,32px)' } as const
const eyebrow = { fontFamily: 'var(--f-mono)', fontSize: 12, letterSpacing: '0.06em', color: 'var(--pl-accent)', textTransform: 'uppercase' as const, marginBottom: 14 }
const h2 = { fontFamily: 'var(--f-sans)', fontWeight: 700, fontSize: 'clamp(22px,3.2vw,32px)', letterSpacing: '-0.03em', color: 'var(--ink)', margin: '0 0 14px' }
const p = { fontSize: 16, lineHeight: 1.7, color: 'var(--ink-3)', margin: '0 0 16px' }
const section = { padding: 'clamp(36px,6vw,56px) 0', borderTop: '1px solid var(--line)' }

export default function AiLinkedinAutomationToolPage() {
  return (
    <LandingShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Hero */}
      <section style={{ ...wrap, padding: 'clamp(48px,8vw,88px) clamp(16px,4vw,32px) clamp(24px,4vw,40px)' }}>
        <div style={eyebrow}>AI LinkedIn automation tool</div>
        <h1 style={{ fontFamily: 'var(--f-sans)', fontWeight: 700, fontSize: 'clamp(30px,5.5vw,52px)', letterSpacing: '-0.04em', lineHeight: 1.08, color: 'var(--ink)', margin: '0 0 18px' }}>
          The AI LinkedIn automation tool that posts in your voice
        </h1>
        <p style={{ ...p, fontSize: 18, maxWidth: 680 }}>
          PersonaLink writes, schedules, and auto-publishes LinkedIn posts that sound like <em>you</em> — not a generic
          AI, and not a spammy outreach bot. It is built in India: billed in INR, GST invoice on every plan, Hinglish supported.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 8 }}>
          <Link href="/voice-analyzer" style={{ background: 'var(--ink)', color: 'var(--bg)', padding: '13px 22px', borderRadius: 'var(--r-md)', fontWeight: 600, fontSize: 15, textDecoration: 'none' }}>Analyze my voice — free</Link>
          <Link href="/pricing" style={{ background: 'transparent', color: 'var(--ink)', padding: '13px 22px', borderRadius: 'var(--r-md)', fontWeight: 600, fontSize: 15, textDecoration: 'none', border: '1px solid var(--line)' }}>See pricing — from ₹999</Link>
        </div>
      </section>

      {/* Content vs outreach */}
      <section style={{ background: 'var(--surface-2)' }}>
        <div style={{ ...wrap, ...section, borderTop: '1px solid var(--line)' }}>
          <div style={eyebrow}>Content automation, not outreach</div>
          <h2 style={h2}>What “LinkedIn automation” should actually mean</h2>
          <p style={p}>
            Search “LinkedIn automation tool” and you mostly get <strong>outreach bots</strong> — tools that fire off
            connection requests and DMs at scale. They live in a grey area of LinkedIn’s terms and are the main reason
            people get their accounts restricted.
          </p>
          <p style={p}>
            PersonaLink is the other kind: <strong>content automation</strong>. It takes the part you actually struggle
            with — showing up consistently in your own voice — and automates that, through LinkedIn’s official posting
            API. No scraping, no mass messaging, no risk to your account.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section style={{ ...wrap, ...section }}>
        <div style={eyebrow}>How it works</div>
        <h2 style={h2}>Four steps from blank page to scheduled post</h2>
        <ol style={{ margin: '8px 0 0', padding: 0, listStyle: 'none', display: 'grid', gap: 14 }}>
          {[
            ['Build your voice fingerprint', 'Paste 3–5 of your posts. We map six voice dimensions — rhythm, vocabulary, openings, pet phrases, emotional register and punctuation.'],
            ['Generate drafts your way', 'Type a thought, record a voice note, or repurpose an old post. Every draft is written inside your fingerprint.'],
            ['Choose your control mode', 'Full Autopilot, Approve Before Posting, or Suggest Only. You decide how much PersonaLink does on its own.'],
            ['Auto-publish on schedule', 'We post at high-attention IST times via official LinkedIn OAuth, then show you what landed.'],
          ].map(([t, d], i) => (
            <li key={t} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              <span style={{ flexShrink: 0, width: 30, height: 30, borderRadius: '50%', background: 'var(--pl-accent-soft)', color: 'var(--pl-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--f-mono)', fontSize: 13, fontWeight: 600, border: '1px solid var(--pl-accent)' }}>{i + 1}</span>
              <div>
                <strong style={{ display: 'block', fontSize: 16, color: 'var(--ink)', marginBottom: 4 }}>{t}</strong>
                <span style={{ fontSize: 15, lineHeight: 1.65, color: 'var(--ink-4)' }}>{d}</span>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Sounds human + Safe */}
      <section style={{ background: 'var(--surface-2)' }}>
        <div style={{ ...wrap, ...section, borderTop: '1px solid var(--line)' }}>
          <h2 style={h2}>Automation that still sounds human</h2>
          <p style={p}>
            Most “AI writers” have a tell — em-dash overload, “in today’s fast-paced world,” robotic symmetry.
            PersonaLink’s <strong>Anti-AI humanizer</strong> strips those tells and constrains every draft to your real
            voice, so automated posts still read like a human wrote them on a day they had time.
          </p>
          <h2 style={{ ...h2, marginTop: 36 }}>Is automating LinkedIn posts allowed?</h2>
          <p style={p}>
            Yes — publishing your own content on a schedule through LinkedIn’s official OAuth is within the rules.
            PersonaLink requests <strong>posting permission only</strong>: it never reads your DMs, never touches your
            network, and never stores your password. The tools that get people banned are the ones that automate
            connections and messages by scraping. That is exactly what PersonaLink does <em>not</em> do.
          </p>
        </div>
      </section>

      {/* Built for India */}
      <section style={{ ...wrap, ...section }}>
        <div style={eyebrow}>Built for India</div>
        <h2 style={h2}>The only major automation tool that bills in rupees</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 14, marginTop: 8 }}>
          {[
            ['INR billing', 'Pay in rupees — no USD forex surcharge, no 2FA card failures.'],
            ['GST invoice', 'GSTIN on every invoice, so your business can claim 18% input tax credit.'],
            ['UPI & Razorpay', 'Pay the way India pays. Cards optional.'],
            ['Hinglish posts', 'Natural code-mixed Hinglish — not stiff translated Hindi or forced English.'],
          ].map(([t, d]) => (
            <div key={t} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', padding: 20 }}>
              <strong style={{ display: 'block', fontSize: 15, color: 'var(--ink)', marginBottom: 6 }}>{t}</strong>
              <span style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--ink-4)' }}>{d}</span>
            </div>
          ))}
        </div>
        <p style={{ ...p, marginTop: 22 }}>
          Looking for the cheapest option? Starter is <strong>₹999/month</strong> — see the{' '}
          <Link href="/cheap-linkedin-ai-tool-india" style={{ color: 'var(--pl-accent)' }}>AI LinkedIn tool for India under ₹1,000</Link>{' '}
          or the full <Link href="/pricing" style={{ color: 'var(--pl-accent)' }}>pricing</Link>.
        </p>
      </section>

      {/* FAQ */}
      <section style={{ background: 'var(--surface-2)' }}>
        <div style={{ ...wrap, ...section, borderTop: '1px solid var(--line)' }}>
          <h2 style={h2}>FAQ</h2>
          <div style={{ marginTop: 8 }}>
            {FAQS.map((f) => (
              <details key={f.q} style={{ borderBottom: '1px solid var(--line)' }}>
                <summary style={{ padding: '16px 0', cursor: 'pointer', fontWeight: 600, fontSize: 15.5, color: 'var(--ink)', listStyle: 'none' }}>{f.q}</summary>
                <div style={{ paddingBottom: 16, fontSize: 14.5, lineHeight: 1.7, color: 'var(--ink-4)' }}>{f.a}</div>
              </details>
            ))}
          </div>
          <div style={{ marginTop: 28, display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            <Link href="/voice-analyzer" style={{ background: 'var(--ink)', color: 'var(--bg)', padding: '13px 22px', borderRadius: 'var(--r-md)', fontWeight: 600, fontSize: 15, textDecoration: 'none' }}>Start with a free voice analysis</Link>
            <Link href="/vs/taplio" style={{ color: 'var(--ink)', padding: '13px 22px', borderRadius: 'var(--r-md)', fontWeight: 600, fontSize: 15, textDecoration: 'none', border: '1px solid var(--line)' }}>Compare vs Taplio</Link>
          </div>
        </div>
      </section>
    </LandingShell>
  )
}
