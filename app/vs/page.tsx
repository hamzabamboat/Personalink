import type { Metadata } from 'next'
import Link from 'next/link'
import { LandingShell } from '@/components/landing/LandingShell'
import { COMPETITORS, COMPETITOR_SLUGS } from '@/lib/competitor-data'

const URL = 'https://personalink.in/vs'

export const metadata: Metadata = {
  title: 'PersonaLink vs the Alternatives — INR, GST, Hinglish',
  description:
    'How PersonaLink compares to Taplio, Supergrow and Kleo — and why an India-first LinkedIn AI tool with INR billing, GST invoices and Hinglish wins for Indian creators.',
  alternates: { canonical: URL },
  openGraph: { type: 'website', locale: 'en_IN', url: URL, siteName: 'PersonaLink', title: 'PersonaLink vs the Alternatives', description: 'Compare PersonaLink to Taplio, Supergrow and Kleo. INR billing, GST invoices, Hinglish.', images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'PersonaLink comparisons' }] },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    { '@type': 'CollectionPage', name: 'PersonaLink comparisons', url: URL, description: 'Head-to-head comparisons of PersonaLink vs other LinkedIn AI tools.' },
    { '@type': 'BreadcrumbList', itemListElement: [ { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://personalink.in' }, { '@type': 'ListItem', position: 2, name: 'Compare', item: URL } ] },
  ],
}

const wrap = { maxWidth: 980, margin: '0 auto', padding: '0 clamp(16px,4vw,32px)' } as const

export default function VsIndexPage() {
  return (
    <LandingShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <section style={{ ...wrap, padding: 'clamp(48px,8vw,80px) clamp(16px,4vw,32px) clamp(16px,3vw,28px)' }}>
        <div style={{ fontFamily: 'var(--f-mono)', fontSize: 12, letterSpacing: '0.06em', color: 'var(--pl-accent)', textTransform: 'uppercase', marginBottom: 14 }}>Compare</div>
        <h1 style={{ fontFamily: 'var(--f-sans)', fontWeight: 700, fontSize: 'clamp(28px,5vw,46px)', letterSpacing: '-0.04em', lineHeight: 1.1, color: 'var(--ink)', margin: '0 0 14px' }}>PersonaLink vs the alternatives</h1>
        <p style={{ fontSize: 17, lineHeight: 1.7, color: 'var(--ink-3)', maxWidth: 640 }}>Most LinkedIn AI tools bill in USD with no GST and no Hinglish. Here’s how PersonaLink compares head-to-head — and where each rival is still a fair pick.</p>
      </section>
      <section style={{ ...wrap, paddingBottom: 'clamp(32px,6vw,56px)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 16 }}>
          {COMPETITOR_SLUGS.map((slug) => {
            const c = COMPETITORS[slug]
            return (
              <Link key={slug} href={`/vs/${slug}`} style={{ display: 'block', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', padding: 22, textDecoration: 'none', boxShadow: 'var(--sh-1)' }}>
                <strong style={{ display: 'block', fontSize: 16.5, color: 'var(--ink)', marginBottom: 8 }}>PersonaLink vs {c.name}</strong>
                <span style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--ink-4)' }}>{c.oneLiner}</span>
                <span style={{ display: 'block', marginTop: 12, fontSize: 13.5, color: 'var(--pl-accent)', fontWeight: 600 }}>See the comparison →</span>
              </Link>
            )
          })}
          <Link href="/blog/best-taplio-alternatives" style={{ display: 'block', background: 'var(--surface-2)', border: '1px dashed var(--line)', borderRadius: 'var(--r-lg)', padding: 22, textDecoration: 'none' }}>
            <strong style={{ display: 'block', fontSize: 16.5, color: 'var(--ink)', marginBottom: 8 }}>Best Taplio alternatives (2026)</strong>
            <span style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--ink-4)' }}>The full roundup, including the cheapest and India-first picks.</span>
            <span style={{ display: 'block', marginTop: 12, fontSize: 13.5, color: 'var(--pl-accent)', fontWeight: 600 }}>Read the guide →</span>
          </Link>
        </div>
        <p style={{ fontSize: 15, color: 'var(--ink-3)', marginTop: 22 }}>Prefer a human ghostwriter? See <Link href="/ai-linkedin-ghostwriter" style={{ color: 'var(--pl-accent)' }}>AI LinkedIn ghostwriter vs hiring one</Link>.</p>
      </section>
    </LandingShell>
  )
}
