import type { Metadata } from 'next'
import Link from 'next/link'
import { WordMark } from '@/components/word-mark'
import { InquiryForm } from '@/components/agency/InquiryForm'
import { ComparisonTable } from './_components/ComparisonTable'
import { FAQ } from './_components/FAQ'
import { PricingTiers } from './_components/PricingTiers'
import { LandingPostHogTracker } from './_components/LandingPostHogTracker'

export const metadata: Metadata = {
  title: 'LinkedIn Tool for Agencies | White-Label, Bulk, INR Billing — PersonaLink',
  description:
    'Run LinkedIn content for 5, 15, or 50 client accounts. Per-client voice fingerprints, white-label dashboard, INR or international billing, GST invoices. Request a custom quote.',
  keywords: [
    'linkedin tool for agencies india',
    'white label linkedin ghostwriting tool',
    'linkedin agency software',
    'taplio agency alternative',
    'multi-client linkedin scheduler',
    'gst linkedin tool',
  ],
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: 'https://personalink.in/for-agencies',
    siteName: 'PersonaLink',
    title: 'PersonaLink for Agencies',
    description:
      'Per-client voice fingerprints. Approvals. White-label invoices. INR billing with GST. Built for agencies that run LinkedIn for 5+ clients.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'PersonaLink for Agencies' }],
  },
  alternates: { canonical: 'https://personalink.in/for-agencies' },
}

const SERIF: React.CSSProperties = {
  fontFamily: 'var(--f-display)',
  fontStyle: 'italic',
  fontWeight: 400,
  color: 'var(--serif-ink)',
}

const FEATURES = [
  {
    title: 'Per-client voice fingerprints',
    body: 'Every client gets a dedicated 6-dimension voice profile. Switch between accounts in one tap. No cross-contamination, no shared workspace voice.',
  },
  {
    title: 'White-label dashboard',
    body: 'Your brand, your colours, your logo. Clients see your tool. We are invisible. Custom subdomain on request.',
  },
  {
    title: 'Bulk operations',
    body: 'One queue across every client account. Schedule, edit, and analyse without juggling browser tabs.',
  },
  {
    title: 'Cross-client analytics',
    body: 'Monthly white-label PDF reports per client. Engagement, post performance, follower delta. Send them as-is.',
  },
  {
    title: 'INR billing with GST',
    body: 'One invoice for your whole agency. INR with GST line items where applicable, or USD/EUR/GBP for international clients.',
  },
]

const AGENCY_MATH = [
  {
    pain: 'Voice slips between clients',
    fix: 'Per-client 6-dim fingerprints stay isolated. Switching clients does not bleed tone.',
  },
  {
    pain: 'Five tools, none speak to each other',
    fix: 'Drafts, schedule, analytics, voice — one dashboard. One bill.',
  },
  {
    pain: 'Clients ask for white-label reports you do not have time to build',
    fix: 'Monthly PDFs auto-generated per client, your logo on top.',
  },
]

export default function ForAgenciesPage() {
  const jsonLdSoftware = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'PersonaLink Agency',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    description:
      'LinkedIn content platform for agencies. Per-client voice fingerprints, white-label dashboard, GST-compliant INR billing.',
    offers: { '@type': 'Offer', priceCurrency: 'INR', price: 'Custom' },
  }
  const jsonLdService = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: 'LinkedIn content management for agencies',
    provider: { '@type': 'Organization', name: 'PersonaLink', url: 'https://personalink.in' },
    areaServed: ['IN', 'Worldwide'],
    serviceType: 'White-label LinkedIn ghostwriting platform',
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        color: 'var(--ink)',
        fontFamily: 'var(--f-sans)',
      }}
    >
      <LandingPostHogTracker />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdSoftware) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdService) }} />

      {/* ─── Nav ─── */}
      <nav
        style={{
          background: 'color-mix(in srgb, var(--surface) 92%, transparent)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid var(--line)',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <div style={navInner}>
          <Link href="/" aria-label="PersonaLink home">
            <WordMark icon wordmark iconSize={30} />
          </Link>
          <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
            <Link href="/#pricing" className="hidden md:inline" style={navLink}>Pricing</Link>
            <Link href="/voice-analyzer" className="hidden md:inline" style={navLink}>Voice analyser</Link>
            <a href="#inquiry" style={navCta}>Request quote</a>
          </div>
        </div>
      </nav>

      {/* ─── 1. Hero ─── */}
      <section style={{ padding: 'clamp(56px, 9vw, 110px) var(--pad) clamp(40px, 6vw, 64px)', borderBottom: '1px solid var(--line)' }}>
        <div style={{ maxWidth: 'var(--max)', margin: '0 auto' }}>
          <div style={badgeStyle}>// for agencies &amp; studios</div>
          <h1
            style={{
              fontSize: 'clamp(34px, 6.5vw, 68px)',
              fontWeight: 700,
              letterSpacing: '-0.04em',
              lineHeight: 1.04,
              margin: '0 0 18px',
              maxWidth: 900,
              color: 'var(--ink)',
            }}
          >
            The LinkedIn tool built for agencies. <span style={SERIF}>Not retrofitted for them.</span>
          </h1>
          <p
            style={{
              fontSize: 'clamp(16px, 2.4vw, 20px)',
              color: 'var(--ink-3)',
              lineHeight: 1.55,
              maxWidth: 720,
              margin: '0 0 28px',
            }}
          >
            Run 5, 15, or 50 client accounts. White-label everything. INR or international billing. GST invoices on day one.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <a href="#inquiry" style={ctaPrimary}>Request a demo</a>
            <a href="#" style={ctaSecondary} aria-disabled>
              {/* TODO: replace href with Loom URL */}
              Watch 90-sec demo
            </a>
          </div>
        </div>
      </section>

      {/* ─── 2. Agency math ─── */}
      <section style={{ padding: 'clamp(56px, 8vw, 96px) var(--pad)', borderBottom: '1px solid var(--line)' }}>
        <div style={{ maxWidth: 'var(--max)', margin: '0 auto' }}>
          <h2 style={h2Style}>
            Stop juggling tools. <span style={SERIF}>Stop missing posts.</span>
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20, marginTop: 32 }}>
            {AGENCY_MATH.map((m, i) => (
              <div key={i}>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', margin: '0 0 6px' }}>{m.pain}</p>
                <p style={{ fontSize: 14, color: 'var(--ink-3)', lineHeight: 1.55, margin: 0 }}>{m.fix}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 3. Features ─── */}
      <section style={{ padding: 'clamp(56px, 8vw, 96px) var(--pad)', background: 'var(--surface-2)', borderBottom: '1px solid var(--line)' }}>
        <div style={{ maxWidth: 'var(--max)', margin: '0 auto' }}>
          <h2 style={h2Style}>What you get.</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginTop: 32 }}>
            {FEATURES.map((f, i) => (
              <div key={i} style={featureCard}>
                <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 8px', color: 'var(--ink)' }}>{f.title}</h3>
                <p style={{ fontSize: 14, color: 'var(--ink-3)', lineHeight: 1.6, margin: 0 }}>{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 4. Comparison table ─── */}
      <section style={{ padding: 'clamp(56px, 8vw, 96px) var(--pad)', borderBottom: '1px solid var(--line)' }}>
        <div style={{ maxWidth: 'var(--max)', margin: '0 auto' }}>
          <h2 style={h2Style}>How we stack up.</h2>
          <ComparisonTable />
        </div>
      </section>

      {/* ─── 5. Custom pricing ─── */}
      <section style={{ padding: 'clamp(56px, 8vw, 96px) var(--pad)', background: 'var(--surface-2)', borderBottom: '1px solid var(--line)' }}>
        <div style={{ maxWidth: 'var(--max)', margin: '0 auto' }}>
          <h2 style={h2Style}>
            How custom pricing <span style={SERIF}>works.</span>
          </h2>
          <div style={{ marginTop: 32 }}>
            <PricingTiers />
          </div>
        </div>
      </section>

      {/* ─── 6. Social proof placeholder ─── */}
      <section style={{ padding: 'clamp(40px, 6vw, 72px) var(--pad)', borderBottom: '1px solid var(--line)' }}>
        <div style={{ maxWidth: 'var(--max)', margin: '0 auto' }}>
          <p
            style={{
              fontSize: 13,
              fontFamily: 'var(--f-mono)',
              color: 'var(--ink-4)',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              marginBottom: 16,
            }}
          >
            // case studies coming soon
          </p>
          {/* TODO: agency case studies + logos */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
            {[0, 1, 2].map(i => (
              <div
                key={i}
                style={{
                  height: 80,
                  background: 'var(--surface)',
                  border: '1px dashed var(--line)',
                  borderRadius: 'var(--r-md)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--ink-4)',
                  fontSize: 12,
                }}
              >
                logo {i + 1}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 7. FAQ ─── */}
      <section style={{ padding: 'clamp(56px, 8vw, 96px) var(--pad)', borderBottom: '1px solid var(--line)' }}>
        <div style={{ maxWidth: 780, margin: '0 auto' }}>
          <h2 style={h2Style}>Questions agencies ask.</h2>
          <div style={{ marginTop: 28 }}>
            <FAQ />
          </div>
        </div>
      </section>

      {/* ─── 8. Inquiry form ─── */}
      <section
        id="inquiry"
        style={{ padding: 'clamp(56px, 8vw, 96px) var(--pad)', background: 'var(--surface-2)', borderBottom: '1px solid var(--line)' }}
      >
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <div style={badgeStyle}>// request a quote</div>
          <h2 style={{ ...h2Style, margin: '14px 0 12px' }}>Tell us about your agency.</h2>
          <p style={{ fontSize: 'clamp(14px, 1.8vw, 16px)', color: 'var(--ink-3)', lineHeight: 1.6, margin: '0 0 28px', maxWidth: 620 }}>
            Thirteen short fields. One human reply within 24 hours. Pricing tailored to your client count, white-label
            needs, and support level.
          </p>
          <InquiryForm />
        </div>
      </section>

      {/* ─── 9. Final CTA ─── */}
      <section style={{ padding: 'clamp(48px, 6vw, 80px) var(--pad)' }}>
        <div style={{ maxWidth: 'var(--max)', margin: '0 auto', textAlign: 'center' }}>
          <p style={{ fontSize: 'clamp(18px, 2.4vw, 24px)', color: 'var(--ink-2)', margin: '0 0 18px', fontWeight: 500 }}>
            Ready when you are.
          </p>
          <a href="#inquiry" style={ctaPrimary}>Request a demo</a>
          <p style={{ marginTop: 18, fontSize: 13, color: 'var(--ink-4)' }}>
            Question first?{' '}
            <a href="mailto:hello@personalink.in" style={{ color: 'var(--pl-accent)', textDecoration: 'underline', textDecorationStyle: 'dotted' }}>
              hello@personalink.in
            </a>
          </p>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer style={{ background: 'var(--bg)', borderTop: '1px solid var(--line)', padding: 'clamp(28px, 4vw, 40px) var(--pad)', fontSize: 13, color: 'var(--ink-4)' }}>
        <div style={{ maxWidth: 'var(--max)', margin: '0 auto', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>© {new Date().getFullYear()} PersonaLink · Built in India</div>
          <div style={{ display: 'flex', gap: 18 }}>
            <Link href="/" style={{ color: 'var(--ink-3)', textDecoration: 'none' }}>Home</Link>
            <Link href="/#pricing" style={{ color: 'var(--ink-3)', textDecoration: 'none' }}>Pricing</Link>
            <Link href="/voice-analyzer" style={{ color: 'var(--ink-3)', textDecoration: 'none' }}>Voice analyser</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

/* ─── Inline shared styles ─── */

const navInner: React.CSSProperties = {
  maxWidth: 'var(--max)',
  margin: '0 auto',
  padding: '0 var(--pad)',
  height: 64,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
}
const navLink: React.CSSProperties = { fontSize: 14, fontWeight: 500, color: 'var(--ink-3)', textDecoration: 'none' }
const navCta: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  color: 'var(--bg)',
  background: 'var(--ink)',
  padding: '9px 18px',
  borderRadius: 'var(--r-sm)',
  textDecoration: 'none',
}
const badgeStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  marginBottom: 18,
  fontFamily: 'var(--f-mono)',
  fontSize: 11.5,
  fontWeight: 500,
  letterSpacing: '0.04em',
  color: 'var(--ink-3)',
  padding: '6px 12px',
  border: '1px solid var(--line)',
  borderRadius: 'var(--r-xs)',
  background: 'var(--surface)',
}
const ctaPrimary: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '14px 28px',
  background: 'var(--ink)',
  color: 'var(--bg)',
  borderRadius: 'var(--r-md)',
  fontWeight: 600,
  fontSize: 15,
  textDecoration: 'none',
}
const ctaSecondary: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '14px 28px',
  background: 'var(--surface)',
  color: 'var(--ink-2)',
  border: '1px solid var(--line)',
  borderRadius: 'var(--r-md)',
  fontWeight: 500,
  fontSize: 15,
  textDecoration: 'none',
}
const h2Style: React.CSSProperties = {
  fontSize: 'clamp(26px, 4vw, 44px)',
  fontWeight: 700,
  letterSpacing: '-0.035em',
  lineHeight: 1.1,
  color: 'var(--ink)',
  margin: '0 0 6px',
  maxWidth: 720,
}
const featureCard: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--line)',
  borderRadius: 'var(--r-lg)',
  padding: '24px 22px',
  boxShadow: 'var(--sh-1)',
}
