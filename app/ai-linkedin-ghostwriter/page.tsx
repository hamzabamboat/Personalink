import type { Metadata } from 'next'
import Link from 'next/link'
import { LandingShell } from '@/components/landing/LandingShell'

const URL = 'https://personalink.in/ai-linkedin-ghostwriter'

export const metadata: Metadata = {
  title: 'AI LinkedIn Ghostwriter — From ₹999 | PersonaLink',
  description:
    'Human LinkedIn ghostwriters cost ₹20,000–50,000/month and still guess your voice. PersonaLink is an AI LinkedIn ghostwriter trained on your real voice, from ₹999.',
  keywords: ['AI LinkedIn ghostwriter', 'LinkedIn ghostwriter alternative', 'AI ghostwriter for LinkedIn', 'LinkedIn ghostwriting tool', 'LinkedIn ghostwriter cost India'],
  alternates: { canonical: URL },
  openGraph: { type: 'website', locale: 'en_IN', url: URL, siteName: 'PersonaLink', title: 'An AI LinkedIn Ghostwriter That Actually Sounds Like You', description: 'Trained on your real voice, from ₹999 — not ₹30,000. INR billing, GST invoices.', images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'AI LinkedIn ghostwriter' }] },
  twitter: { card: 'summary_large_image', title: 'AI LinkedIn Ghostwriter — From ₹999 | PersonaLink', description: 'An AI ghostwriter trained on your real voice. From ₹999, not ₹30,000.', images: ['/og-image.png'] },
}

const FAQS = [
  { q: 'How much does a LinkedIn ghostwriter cost in India?', a: 'Human LinkedIn ghostwriters in India typically charge ₹20,000–50,000+ per month, depending on volume and seniority. PersonaLink is an AI LinkedIn ghostwriter starting at ₹999/month, trained on your own voice.' },
  { q: 'Is an AI ghostwriter as good as a human?', a: 'For voice-matching and consistency, a well-trained AI is hard to beat — PersonaLink models six dimensions of your voice and never has an off day. A human ghostwriter still wins on deep strategy and relationship nuance, so some people use both.' },
  { q: 'Will the posts actually sound like me?', a: 'Yes — that’s the entire point. We build a voice fingerprint from your real posts and constrain every draft to it, with an Anti-AI humanizer to strip the robotic tells.' },
  { q: 'Do I still control what gets published?', a: 'Always. Choose Full Autopilot, Approve Before Posting, or Suggest Only. You own the publish button.' },
]

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    { '@type': 'SoftwareApplication', name: 'PersonaLink — AI LinkedIn Ghostwriter', applicationCategory: 'BusinessApplication', operatingSystem: 'Web', description: 'An AI LinkedIn ghostwriter trained on your own voice. From ₹999/month, INR billing, GST invoices.', url: URL, offers: { '@type': 'AggregateOffer', lowPrice: '999', highPrice: '4999', priceCurrency: 'INR', offerCount: 3, availability: 'https://schema.org/InStock' } },
    { '@type': 'BreadcrumbList', itemListElement: [ { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://personalink.in' }, { '@type': 'ListItem', position: 2, name: 'AI LinkedIn Ghostwriter', item: URL } ] },
    { '@type': 'FAQPage', mainEntity: FAQS.map(({ q, a }) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
  ],
}

const wrap = { maxWidth: 820, margin: '0 auto', padding: '0 clamp(16px,4vw,32px)' } as const
const eyebrow = { fontFamily: 'var(--f-mono)', fontSize: 12, letterSpacing: '0.06em', color: 'var(--pl-accent)', textTransform: 'uppercase' as const, marginBottom: 14 }
const h2 = { fontFamily: 'var(--f-sans)', fontWeight: 700, fontSize: 'clamp(22px,3.2vw,30px)', letterSpacing: '-0.03em', color: 'var(--ink)', margin: '0 0 14px' }
const p = { fontSize: 16, lineHeight: 1.7, color: 'var(--ink-3)', margin: '0 0 16px' }
const section = { padding: 'clamp(32px,5vw,52px) 0', borderTop: '1px solid var(--line)' }

export default function GhostwriterPage() {
  return (
    <LandingShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <section style={{ ...wrap, padding: 'clamp(48px,8vw,84px) clamp(16px,4vw,32px) clamp(20px,4vw,36px)' }}>
        <div style={eyebrow}>AI LinkedIn ghostwriter</div>
        <h1 style={{ fontFamily: 'var(--f-sans)', fontWeight: 700, fontSize: 'clamp(28px,5vw,48px)', letterSpacing: '-0.04em', lineHeight: 1.12, color: 'var(--ink)', margin: '0 0 18px' }}>
          An AI LinkedIn ghostwriter that actually sounds like you — for ₹999, not ₹30,000
        </h1>
        <p style={{ ...p, fontSize: 18, maxWidth: 660 }}>A human ghostwriter is expensive and still guesses your voice. PersonaLink learns it — six dimensions of how you actually write — and ghostwrites in it, every day, from ₹999/month.</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 8 }}>
          <Link href="/voice-analyzer" style={{ background: 'var(--ink)', color: 'var(--bg)', padding: '13px 22px', borderRadius: 'var(--r-md)', fontWeight: 600, fontSize: 15, textDecoration: 'none' }}>Analyze my voice — free</Link>
          <Link href="/pricing" style={{ color: 'var(--ink)', padding: '13px 22px', borderRadius: 'var(--r-md)', fontWeight: 600, fontSize: 15, textDecoration: 'none', border: '1px solid var(--line)' }}>See pricing</Link>
        </div>
      </section>
      <section style={{ background: 'var(--surface-2)' }}><div style={{ ...wrap, ...section }}>
        <div style={eyebrow}>The comparison</div>
        <h2 style={h2}>AI ghostwriter vs human ghostwriter</h2>
        <div style={{ overflow: 'hidden', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', background: 'var(--surface)' }}>
          {[
            ['Monthly cost', 'From ₹999', '₹20,000–50,000+'],
            ['Voice match', '6-dimension fingerprint of your real writing', 'Their interpretation of your voice'],
            ['Turnaround', 'Minutes, on demand', 'Days, in batches'],
            ['Consistency', 'Never an off day', 'Varies by writer/week'],
            ['India fit', 'INR, GST invoice, UPI, Hinglish', 'Depends on the writer'],
          ].map(([label, pl, human], i) => (
            <div key={label} style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.4fr 1.4fr', gap: 8, padding: '12px 14px', borderTop: i === 0 ? 'none' : '1px solid var(--line)', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: 'var(--ink-4)' }}>{label}</span>
              <span style={{ fontSize: 13.5, color: 'var(--ink)', fontWeight: 500 }}>{pl}</span>
              <span style={{ fontSize: 13, color: 'var(--ink-4)' }}>{human}</span>
            </div>
          ))}
        </div>
      </div></section>
      <section style={{ ...wrap, ...section }}>
        <div style={eyebrow}>Honest</div>
        <h2 style={h2}>When to still hire a human</h2>
        <p style={p}>If you want someone to own your whole content strategy, run interviews, and manage relationships, a great human ghostwriter earns their fee. PersonaLink is for the other 90% of the job: showing up consistently, in your voice, without the monthly retainer. Many people use it to draft, then bring a human in for the big set-pieces.</p>
        <p style={p}>See how it stacks up against the tools too: <Link href="/vs" style={{ color: 'var(--pl-accent)' }}>PersonaLink vs the alternatives</Link>.</p>
      </section>
      <section style={{ background: 'var(--surface-2)' }}><div style={{ ...wrap, ...section }}>
        <h2 style={h2}>FAQ</h2>
        <div style={{ marginTop: 8 }}>{FAQS.map((f) => (<details key={f.q} style={{ borderBottom: '1px solid var(--line)' }}><summary style={{ padding: '15px 0', cursor: 'pointer', fontWeight: 600, fontSize: 15.5, color: 'var(--ink)', listStyle: 'none' }}>{f.q}</summary><div style={{ paddingBottom: 15, fontSize: 14.5, lineHeight: 1.7, color: 'var(--ink-4)' }}>{f.a}</div></details>))}</div>
        <div style={{ marginTop: 26 }}><Link href="/voice-analyzer" style={{ background: 'var(--ink)', color: 'var(--bg)', padding: '13px 22px', borderRadius: 'var(--r-md)', fontWeight: 600, fontSize: 15, textDecoration: 'none' }}>See your voice fingerprint — free</Link></div>
      </div></section>
    </LandingShell>
  )
}
