import type { Metadata } from 'next'
import Link from 'next/link'
import { LandingShell } from '@/components/landing/LandingShell'

const URL = 'https://personalink.in/features'

export const metadata: Metadata = {
  title: 'PersonaLink Features — Write, Humanize, Schedule, Repurpose',
  description:
    'Everything PersonaLink does to run your LinkedIn in your voice: voice fingerprint, Anti-AI humanizer, voice-to-post, IST scheduler, repurpose engine, Hinglish. INR billing.',
  alternates: { canonical: URL },
  openGraph: { type: 'website', locale: 'en_IN', url: URL, siteName: 'PersonaLink', title: 'PersonaLink Features', description: 'Write, humanize, schedule and repurpose LinkedIn posts in your voice. Built for India.', images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'PersonaLink features' }] },
}

const FEATURES: ReadonlyArray<readonly [string, string, string]> = [
  ['/ai-linkedin-automation-tool', 'AI automation tool', 'The full picture: write, schedule and auto-publish in your voice via official LinkedIn OAuth.'],
  ['/features/anti-ai-humanizer', 'Anti-AI humanizer', 'Strips the tells that make AI obvious and writes inside your real voice fingerprint.'],
  ['/features/voice-to-post', 'Voice note to post', 'Record a 2-minute voice note; get a polished post back in your voice. Hinglish included.'],
  ['/features/linkedin-post-scheduler-india', 'IST scheduler', 'Schedule and auto-publish at peak Indian times — not US-timezone defaults.'],
  ['/features/repurpose-engine', 'Repurpose engine', 'Turn one post — or a blog/podcast — into a week of fresh angles.'],
  ['/hinglish-linkedin-post-generator', 'Hinglish generator', 'Natural code-mixed Hinglish, not stiff translated Hindi or forced English.'],
]

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    { '@type': 'CollectionPage', name: 'PersonaLink Features', url: URL, description: 'Features of PersonaLink — the AI LinkedIn tool built for India.' },
    { '@type': 'BreadcrumbList', itemListElement: [ { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://personalink.in' }, { '@type': 'ListItem', position: 2, name: 'Features', item: URL } ] },
  ],
}

const wrap = { maxWidth: 980, margin: '0 auto', padding: '0 clamp(16px,4vw,32px)' } as const

export default function FeaturesIndexPage() {
  return (
    <LandingShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <section style={{ ...wrap, padding: 'clamp(48px,8vw,80px) clamp(16px,4vw,32px) clamp(16px,3vw,28px)' }}>
        <div style={{ fontFamily: 'var(--f-mono)', fontSize: 12, letterSpacing: '0.06em', color: 'var(--pl-accent)', textTransform: 'uppercase', marginBottom: 14 }}>Features</div>
        <h1 style={{ fontFamily: 'var(--f-sans)', fontWeight: 700, fontSize: 'clamp(28px,5vw,46px)', letterSpacing: '-0.04em', lineHeight: 1.1, color: 'var(--ink)', margin: '0 0 14px' }}>Write, humanize, schedule, repurpose</h1>
        <p style={{ fontSize: 17, lineHeight: 1.7, color: 'var(--ink-3)', maxWidth: 620 }}>Everything PersonaLink does to run your LinkedIn in your own voice — built for India, billed in INR.</p>
      </section>
      <section style={{ ...wrap, paddingBottom: 'clamp(32px,6vw,56px)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 16 }}>
          {FEATURES.map(([href, title, desc]) => (
            <Link key={href} href={href} style={{ display: 'block', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', padding: 22, textDecoration: 'none', boxShadow: 'var(--sh-1)' }}>
              <strong style={{ display: 'block', fontSize: 16.5, color: 'var(--ink)', marginBottom: 8 }}>{title}</strong>
              <span style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--ink-4)' }}>{desc}</span>
              <span style={{ display: 'block', marginTop: 12, fontSize: 13.5, color: 'var(--pl-accent)', fontWeight: 600 }}>Learn more →</span>
            </Link>
          ))}
        </div>
        <div style={{ marginTop: 28 }}>
          <Link href="/pricing" style={{ background: 'var(--ink)', color: 'var(--bg)', padding: '13px 22px', borderRadius: 'var(--r-md)', fontWeight: 600, fontSize: 15, textDecoration: 'none' }}>See pricing — from ₹999</Link>
        </div>
      </section>
    </LandingShell>
  )
}
