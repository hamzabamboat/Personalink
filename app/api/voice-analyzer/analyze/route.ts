import { NextRequest, NextResponse } from 'next/server'
import { distillVoiceFingerprintScored } from '@/lib/anthropic'
import { supabaseAdmin } from '@/lib/supabase-admin'
import {
  extractIp,
  ipHash,
  checkDailyIpLimit,
  tryFetchLinkedinPostText,
  looksLikeLinkedinPostUrl,
  VOICE_ANALYZER_LIMITS,
} from '@/lib/voice-analyzer'

// Generous timeout — fingerprint distill + optional URL fetches.
export const maxDuration = 60

type AnalyzeRequest = {
  samples: Array<string>      // raw text OR a LinkedIn URL (we detect)
  mode?: 'text' | 'url' | 'mixed'
}

type AnalyzeResponse =
  | { ok: true; token: string }
  | { ok: false; error: string; sampleErrors?: Array<{ index: number; message: string }> }

export async function POST(request: NextRequest): Promise<NextResponse<AnalyzeResponse>> {
  let body: AnalyzeRequest
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 })
  }

  const inputs = Array.isArray(body?.samples) ? body.samples : []
  if (inputs.length < VOICE_ANALYZER_LIMITS.MIN_SAMPLES) {
    return NextResponse.json(
      { ok: false, error: `Please provide ${VOICE_ANALYZER_LIMITS.MIN_SAMPLES} writing samples or post URLs.` },
      { status: 400 },
    )
  }

  // IP-based daily rate limit (3/day). Hashed for privacy.
  const ip = extractIp(request.headers)
  const hash = ipHash(ip)
  const limit = await checkDailyIpLimit(hash)
  if (!limit.allowed) {
    return NextResponse.json(
      { ok: false, error: 'You\'ve hit the free daily limit (3 analyses per day). Sign up to keep going.' },
      { status: 429 },
    )
  }

  // Resolve each input: either it's a LinkedIn URL we attempt to fetch, or it's pasted text.
  const sampleErrors: Array<{ index: number; message: string }> = []
  const resolved: string[] = []
  for (let i = 0; i < Math.min(inputs.length, VOICE_ANALYZER_LIMITS.MAX_SAMPLES); i++) {
    const raw = (inputs[i] || '').trim()
    if (!raw) {
      sampleErrors.push({ index: i, message: 'Empty. Paste a post or a LinkedIn URL.' })
      continue
    }
    if (looksLikeLinkedinPostUrl(raw)) {
      const fetched = await tryFetchLinkedinPostText(raw)
      if (!fetched || fetched.length < VOICE_ANALYZER_LIMITS.MIN_SAMPLE_CHARS) {
        sampleErrors.push({
          index: i,
          message: 'LinkedIn blocks automated fetches. Paste the post text directly instead.',
        })
        continue
      }
      resolved.push(fetched.slice(0, VOICE_ANALYZER_LIMITS.MAX_SAMPLE_CHARS))
      continue
    }
    if (raw.length < VOICE_ANALYZER_LIMITS.MIN_SAMPLE_CHARS) {
      sampleErrors.push({
        index: i,
        message: `Too short. Paste at least ${VOICE_ANALYZER_LIMITS.MIN_SAMPLE_CHARS} characters.`,
      })
      continue
    }
    resolved.push(raw.slice(0, VOICE_ANALYZER_LIMITS.MAX_SAMPLE_CHARS))
  }

  if (resolved.length < VOICE_ANALYZER_LIMITS.MIN_SAMPLES) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Couldn\'t use enough of your samples.',
        sampleErrors,
      },
      { status: 400 },
    )
  }

  // Call Claude for the structured fingerprint. ~3K input tokens worst case.
  let fingerprint
  try {
    fingerprint = await distillVoiceFingerprintScored(resolved)
  } catch (err) {
    console.error('[voice-analyzer.analyze] fingerprint failed:', err)
    return NextResponse.json(
      { ok: false, error: 'Voice analysis failed. Try again in a moment.' },
      { status: 502 },
    )
  }

  if (!fingerprint.summary) {
    return NextResponse.json(
      { ok: false, error: 'We couldn\'t read your voice from these samples. Try longer or more varied posts.' },
      { status: 422 },
    )
  }

  const { data, error } = await supabaseAdmin
    .from('voice_reports')
    .insert({
      ip_hash: hash,
      samples: resolved,
      fingerprint,
    })
    .select('token')
    .single()

  if (error || !data?.token) {
    console.error('[voice-analyzer.analyze] persist failed:', error)
    return NextResponse.json({ ok: false, error: 'Could not save report.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, token: data.token })
}
