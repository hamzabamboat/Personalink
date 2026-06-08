import type { Metadata } from 'next'
import Link from 'next/link'
import { LandingShell } from '@/components/landing/LandingShell'
import { CostCalculator } from '@/components/tools/CostCalculator'

const URL = 'https://personalink.in/tools/linkedin-cost-calculator'

export const metadata: Metadata = {
  title: 'LinkedIn AI Tool Cost Calculator (INR vs USD) | PersonaLink',
  description:
    'See what a LinkedIn AI tool actually costs in India. Compare Taplio, Supergrow and Kleo in INR vs PersonaLink — including forex and lost GST credit.',
  keywords: ['LinkedIn tool cost India', 'Taplio price in INR', 'LinkedIn AI tool cost calculator', 'Taplio cost India'],
  alternates: { canonical: URL },
  openGraph: { type: 'website', locale: 'en_IN', url: URL, siteName: 'PersonaLink', title: 'LinkedIn AI Tool Cost Calculator — INR vs USD', description: 'What a LinkedIn AI tool really costs in India, with forex and GST factored in.', images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'LinkedIn AI tool cost calculator' }] },
  twitter: { card: 'summary_large_image', title: 'LinkedIn AI Tool Cost Calculator (INR vs USD)', description: 'What a LinkedIn AI tool really costs in India — Taplio, Supergrow, Kleo vs PersonaLink.', images: ['/og-image.png'] },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    { '@type': 'WebApplication', name: 'LinkedIn AI Tool Cost Calculator', applicationCategory: 'BusinessApplication', operatingSystem: 'Web', url: URL, description: 'Compare the real INR cost of LinkedIn AI tools (Taplio, Supergrow, Kleo) against PersonaLink.', offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' } },
    { '@type': 'BreadcrumbList', itemListElement: [ { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://personalink.in' }, { '@type': 'ListItem', position: 2, name: 'LinkedIn Cost Calculator', item: URL } ] },
  ],
}

const wrap = { maxWidth: 820, margin: '0 auto', padding: '0 clamp(16px,4vw,32px)' } as const

export default function CostCalculatorPage() {
  return (
    <LandingShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <section style={{ ...wrap, padding: 'clamp(48px,8vw,80px) clamp(16px,4vw,32px) clamp(16px,3vw,24px)' }}>
        <div style={{ fontFamily: 'var(--f-mono)', fontSize: 12, letterSpacing: '0.06em', color: 'var(--pl-accent)', textTransform: 'uppercase', marginBottom: 14 }}>Free tool</div>
        <h1 style={{ fontFamily: 'var(--f-sans)', fontWeight: 700, fontSize: 'clamp(28px,5vw,44px)', letterSpacing: '-0.04em', lineHeight: 1.12, color: 'var(--ink)', margin: '0 0 14px' }}>
          What a LinkedIn AI tool actually costs in India
        </h1>
        <p style={{ fontSize: 17, lineHeight: 1.7, color: 'var(--ink-3)', maxWidth: 640 }}>USD tools look cheap on the sticker. Add forex and the GST credit you can’t claim, and the picture changes. Pick a tool and your posting volume to see the real INR comparison.</p>
      </section>
      <section style={{ ...wrap, paddingBottom: 'clamp(20px,4vw,32px)' }}>
        <CostCalculator />
      </section>
      <section style={{ ...wrap, paddingBottom: 'clamp(36px,6vw,60px)' }}>
        <p style={{ fontSize: 16, lineHeight: 1.7, color: 'var(--ink-3)' }}>
          PersonaLink bills in INR with a GST invoice from ₹999/month. See the <Link href="/cheap-linkedin-ai-tool-india" style={{ color: 'var(--pl-accent)' }}>under-₹1,000 plan</Link>, the full <Link href="/pricing" style={{ color: 'var(--pl-accent)' }}>pricing</Link>, or the <Link href="/blog/cheapest-ai-linkedin-tools-india" style={{ color: 'var(--pl-accent)' }}>honest cheapest-tools comparison</Link>.
        </p>
        <div style={{ marginTop: 20 }}>
          <Link href="/voice-analyzer" style={{ background: 'var(--ink)', color: 'var(--bg)', padding: '13px 22px', borderRadius: 'var(--r-md)', fontWeight: 600, fontSize: 15, textDecoration: 'none' }}>Try PersonaLink free</Link>
        </div>
      </section>
    </LandingShell>
  )
}
