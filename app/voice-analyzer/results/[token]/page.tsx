import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { WordMark } from '@/components/word-mark'
import { supabaseAdmin } from '@/lib/supabase-admin'
import type { ScoredVoiceFingerprint } from '@/lib/anthropic'
import { ResultsCard } from './_components/results-card'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type Report = {
  id: string
  token: string
  fingerprint: ScoredVoiceFingerprint
  created_at: string
}

async function fetchReport(token: string): Promise<Report | null> {
  if (!UUID_RE.test(token)) return null
  const { data } = await supabaseAdmin
    .from('voice_reports')
    .select('id, token, fingerprint, created_at')
    .eq('token', token)
    .maybeSingle()
  return (data as Report | null) ?? null
}

export async function generateMetadata(
  { params }: { params: Promise<{ token: string }> },
): Promise<Metadata> {
  const { token } = await params
  const report = await fetchReport(token)
  const title = 'My LinkedIn Voice Fingerprint — PersonaLink'
  const description = report?.fingerprint?.one_liner
    || 'I just analysed my LinkedIn writing voice on 6 dimensions. See yours, free, no signup.'
  const ogUrl = `https://personalink.in/api/og/voice-report?token=${encodeURIComponent(token)}`
  const pageUrl = `https://personalink.in/voice-analyzer/results/${encodeURIComponent(token)}`

  return {
    title,
    description,
    alternates: { canonical: pageUrl },
    openGraph: {
      type: 'website',
      url: pageUrl,
      siteName: 'PersonaLink',
      title,
      description,
      images: [{ url: ogUrl, width: 1200, height: 630, alt: 'My LinkedIn Voice Fingerprint' }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogUrl],
    },
  }
}

export default async function VoiceReportPage(
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params
  const report = await fetchReport(token)
  if (!report) notFound()

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--ink)', fontFamily: 'var(--f-sans)' }}>
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
            <Link
              href="/voice-analyzer"
              style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-3)', textDecoration: 'none' }}
            >
              Try yours
            </Link>
            <Link
              href="/#pricing"
              style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-3)', textDecoration: 'none' }}
            >
              Pricing
            </Link>
          </div>
        </div>
      </nav>

      <div
        style={{
          maxWidth: 820,
          margin: '0 auto',
          padding: 'clamp(32px,6vw,64px) clamp(16px,4vw,24px) clamp(64px,10vw,120px)',
        }}
      >
        <div style={{ marginBottom: 'clamp(24px,4vw,36px)' }}>
          <div
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 11,
              letterSpacing: '.06em',
              color: 'var(--ink-4)',
              textTransform: 'uppercase',
              marginBottom: 12,
            }}
          >
            // your voice fingerprint
          </div>
          <h1
            style={{
              fontSize: 'clamp(26px,5vw,40px)',
              fontWeight: 500,
              letterSpacing: '-0.035em',
              lineHeight: 1.08,
              margin: '0 0 14px',
            }}
          >
            {report.fingerprint.one_liner || 'Your LinkedIn voice, decoded.'}
          </h1>
          {report.fingerprint.summary && (
            <p style={{ fontSize: 'clamp(15px,2.1vw,18px)', color: 'var(--ink-3)', lineHeight: 1.55, margin: 0 }}>
              {report.fingerprint.summary}
            </p>
          )}
        </div>

        <ResultsCard token={report.token} fingerprint={report.fingerprint} />
      </div>
    </div>
  )
}
