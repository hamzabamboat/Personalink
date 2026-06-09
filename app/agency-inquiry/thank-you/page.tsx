import type { Metadata } from 'next'
import Link from 'next/link'
import { WordMark } from '@/components/word-mark'
import { ThankYouTracker } from './_components/ThankYouTracker'

export const metadata: Metadata = {
  title: 'Got your inquiry — PersonaLink',
  robots: { index: false, follow: false },
}

export default async function AgencyInquiryThankYou({
  searchParams,
}: {
  searchParams: Promise<{ name?: string; agency?: string }>
}) {
  const { name, agency } = await searchParams
  const firstName = (name ?? '').trim().slice(0, 40)
  const agencyName = (agency ?? '').trim().slice(0, 80)

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        color: 'var(--ink)',
        fontFamily: 'var(--f-sans)',
      }}
    >
      <ThankYouTracker />

      <nav
        style={{
          borderBottom: '1px solid var(--line)',
          padding: '0 var(--pad)',
          height: 64,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <Link href="/" aria-label="PersonaLink home">
          <WordMark icon wordmark iconSize={30} />
        </Link>
      </nav>

      <section style={{ padding: 'clamp(56px, 8vw, 96px) var(--pad)' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: 'var(--pl-accent)',
              color: 'var(--bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 24,
            }}
            aria-hidden
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" style={{ width: 32, height: 32 }}>
              <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          <h1
            style={{
              fontSize: 'clamp(28px, 4.5vw, 44px)',
              fontWeight: 700,
              letterSpacing: '-0.035em',
              lineHeight: 1.1,
              color: 'var(--ink)',
              margin: '0 0 14px',
            }}
          >
            Got it{firstName ? `, ${firstName}` : ''}.
          </h1>

          <p
            style={{
              fontSize: 'clamp(15px, 2vw, 18px)',
              color: 'var(--ink-3)',
              lineHeight: 1.6,
              margin: '0 0 8px',
              maxWidth: 520,
            }}
          >
            I will reply within 24 hours with next steps tailored to {agencyName ? agencyName : 'your setup'}.
          </p>
          <p
            style={{
              fontSize: 14,
              color: 'var(--ink-4)',
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            If anything comes up in the meantime, write to{' '}
            <a href="mailto:hello@personalink.in" style={{ color: 'var(--pl-accent)', textDecoration: 'underline', textDecorationStyle: 'dotted' }}>
              hello@personalink.in
            </a>
            .
          </p>

          <p style={{ marginTop: 40, fontSize: 14, color: 'var(--ink-3)' }}>— Hamza, PersonaLink</p>
        </div>
      </section>
    </div>
  )
}
