import type { Metadata } from 'next'
import Link from 'next/link'
import { WordMark } from '@/components/word-mark'
import { getWeeklyVoiceReportCount } from '@/lib/voice-analyzer'
import { AnalyzerForm } from './_components/analyzer-form'

// Refresh the social-proof count every 5 minutes so the page stays mostly static.
export const revalidate = 300

export const metadata: Metadata = {
  title: 'Free LinkedIn Voice Analyzer — See Your Writing Style in 30 Seconds',
  description: 'Paste 3 of your LinkedIn posts and see your writing voice scored on 6 dimensions — rhythm, vocabulary, warmth, hook power, and more. No signup. Free.',
  keywords: [
    'linkedin voice analyzer',
    'how do I sound on linkedin',
    'linkedin writing style',
    'voice fingerprint',
    'linkedin post analyzer',
    'free linkedin tool',
    'writing voice analyzer',
  ],
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: 'https://personalink.in/voice-analyzer',
    siteName: 'PersonaLink',
    title: 'Free LinkedIn Voice Analyzer — See Your Writing Style in 30 Seconds',
    description: 'See your LinkedIn writing voice scored on 6 dimensions. Paste 3 posts. No signup. Free.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'PersonaLink Voice Analyzer' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Free LinkedIn Voice Analyzer',
    description: 'See your LinkedIn writing voice scored on 6 dimensions. Free, no signup.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://personalink.in/voice-analyzer',
  },
}

const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'PersonaLink Voice Analyzer',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  url: 'https://personalink.in/voice-analyzer',
  description: 'A free tool that analyses your LinkedIn writing samples and scores your voice on 6 dimensions: rhythm, vocabulary, personal storytelling, punctuation play, warmth, and hook power.',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
  publisher: { '@type': 'Organization', name: 'PersonaLink', url: 'https://personalink.in' },
}

export default async function VoiceAnalyzerPage() {
  const weeklyCount = await getWeeklyVoiceReportCount()
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--ink)', fontFamily: 'var(--f-sans)' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />

      <nav
        style={{
          background: 'color-mix(in srgb, var(--surface) 95%, transparent)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid var(--line)',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <div
          style={{
            maxWidth: 1100,
            margin: '0 auto',
            padding: '0 clamp(16px,4vw,32px)',
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Link href="/" aria-label="PersonaLink home">
            <WordMark icon wordmark iconSize={30} />
          </Link>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <Link href="/#pricing" style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-3)', textDecoration: 'none' }}>
              Pricing
            </Link>
            <Link href="/blog" style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-3)', textDecoration: 'none' }}>
              Blog
            </Link>
          </div>
        </div>
      </nav>

      <div
        style={{
          maxWidth: 720,
          margin: '0 auto',
          padding: 'clamp(40px,7vw,72px) clamp(16px,4vw,24px) clamp(64px,10vw,120px)',
        }}
      >
        <div style={{ marginBottom: 'clamp(28px,5vw,40px)' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              flexWrap: 'wrap',
              marginBottom: 14,
            }}
          >
            <span
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 11,
                letterSpacing: '.06em',
                color: 'var(--ink-4)',
                textTransform: 'uppercase',
              }}
            >
              // free tool · no signup
            </span>
            {weeklyCount !== null && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontFamily: 'var(--f-mono)',
                  fontSize: 11,
                  letterSpacing: '.04em',
                  color: 'var(--pl-accent)',
                  padding: '4px 10px',
                  borderRadius: 'var(--r-pill)',
                  background: 'color-mix(in srgb, var(--pl-accent) 10%, var(--surface))',
                  border: '1px solid color-mix(in srgb, var(--pl-accent) 25%, var(--line))',
                }}
              >
                <span
                  aria-hidden
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: 'var(--pl-accent)',
                  }}
                />
                {weeklyCount.toLocaleString('en-IN')} analyses this week
              </span>
            )}
          </div>
          <h1
            style={{
              fontSize: 'clamp(30px,6vw,52px)',
              fontWeight: 500,
              letterSpacing: '-0.04em',
              lineHeight: 1.04,
              color: 'var(--ink)',
              margin: '0 0 18px',
            }}
          >
            See how PersonaLink will write like you.
          </h1>
          <p style={{ fontSize: 'clamp(15px,2.2vw,18px)', color: 'var(--ink-3)', lineHeight: 1.55, margin: 0 }}>
            Paste 3 of your LinkedIn posts. We&apos;ll score your voice on 6 dimensions — rhythm, vocabulary, warmth, hook
            power, and more — and show you the signature phrases that make you sound like you. Free. No signup.
          </p>
        </div>

        <AnalyzerForm />

        {/* Trust strip */}
        <div
          style={{
            marginTop: 'clamp(40px,6vw,56px)',
            paddingTop: 'clamp(24px,4vw,32px)',
            borderTop: '1px solid var(--line)',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            color: 'var(--ink-4)',
            fontSize: 13,
          }}
        >
          <div>
            <strong style={{ color: 'var(--ink-3)' }}>Privacy:</strong> we don&apos;t store your name, your account, or
            your LinkedIn. We hash your IP and keep your 3 samples only to render your report.
          </div>
          <div>
            <strong style={{ color: 'var(--ink-3)' }}>How it works:</strong> Claude reads your samples, identifies your
            sentence rhythm, vocabulary, openers, pet phrases, emotional register, and punctuation tics, and returns a
            shareable fingerprint card.
          </div>
        </div>
      </div>
    </div>
  )
}
