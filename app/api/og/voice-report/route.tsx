import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import type { ScoredVoiceFingerprint } from '@/lib/anthropic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const DIMS: Array<{ key: keyof ScoredVoiceFingerprint['scores']; label: string }> = [
  { key: 'burstiness', label: 'Burstiness' },
  { key: 'vocabulary', label: 'Vocabulary' },
  { key: 'personal', label: 'Personal' },
  { key: 'punctuation_play', label: 'Punctuation' },
  { key: 'warmth', label: 'Warmth' },
  { key: 'hook_power', label: 'Hook Power' },
]

export async function GET(request: NextRequest) {
  const token = (request.nextUrl.searchParams.get('token') || '').trim()
  if (!UUID_RE.test(token)) {
    return new Response('Invalid token', { status: 400 })
  }

  const { data } = await supabaseAdmin
    .from('voice_reports')
    .select('fingerprint')
    .eq('token', token)
    .maybeSingle()

  const fp = (data?.fingerprint as ScoredVoiceFingerprint | undefined) ?? null
  const headline = fp?.one_liner || 'My LinkedIn Voice Fingerprint'
  const scores = fp?.scores
  const phrases = (fp?.signature_phrases || []).slice(0, 3)

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(135deg, #0B1024 0%, #1F2A5E 60%, #2B4DFF 100%)',
          color: '#fff',
          fontFamily: 'sans-serif',
          padding: '56px 64px',
          position: 'relative',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: 'rgba(255,255,255,0.7)',
            fontSize: 18,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontWeight: 600 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: '#fff',
                color: '#2B4DFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 22,
                fontWeight: 800,
              }}
            >
              P
            </div>
            <span>PersonaLink · Voice Analyzer</span>
          </div>
          <div>personalink.in</div>
        </div>

        {/* Headline */}
        <div
          style={{
            display: 'flex',
            marginTop: 56,
            fontSize: headline.length > 70 ? 44 : 56,
            fontWeight: 600,
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
            color: '#fff',
            maxWidth: '90%',
          }}
        >
          {headline}
        </div>

        {/* Score grid */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 12,
            marginTop: 'auto',
            marginBottom: phrases.length > 0 ? 20 : 0,
          }}
        >
          {DIMS.map(d => {
            const v = scores?.[d.key] ?? 50
            return (
              <div
                key={d.key}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  background: 'rgba(255,255,255,0.10)',
                  border: '1px solid rgba(255,255,255,0.18)',
                  borderRadius: 14,
                  padding: '14px 18px',
                  minWidth: 156,
                }}
              >
                <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {d.label}
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 4 }}>
                  <span style={{ fontSize: 36, fontWeight: 700, color: '#fff' }}>{v}</span>
                  <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>/ 100</span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer phrase strip */}
        {phrases.length > 0 && (
          <div
            style={{
              display: 'flex',
              gap: 12,
              flexWrap: 'wrap',
              marginTop: 16,
              fontSize: 16,
              color: 'rgba(255,255,255,0.75)',
            }}
          >
            <span style={{ color: 'rgba(255,255,255,0.5)' }}>signature:</span>
            {phrases.map((p, i) => (
              <span key={i} style={{ fontStyle: 'italic' }}>“{p}”{i < phrases.length - 1 ? ' ·' : ''}</span>
            ))}
          </div>
        )}
      </div>
    ),
    {
      width: 1200,
      height: 630,
      // Cache the OG image at the CDN for an hour; it never changes for a given token.
      headers: {
        'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
      },
    },
  )
}
