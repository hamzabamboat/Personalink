import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { checkIpRateLimit } from '@/lib/rate-limiter'
import {
  AUDIENCE_SIZES,
  PAYOUT_METHODS,
  PROMOTION_CHANNELS,
  generateRefCode,
  AFFILIATE_COMMISSION_RATE,
  AFFILIATE_COMMISSION_DURATION_MONTHS,
} from '@/lib/affiliate'
import {
  sendAffiliateApplicationAdminAlert,
  sendAffiliateApplicationAutoReply,
  type AffiliateApplicationRecord,
} from '@/lib/email'
import { getPostHogClient } from '@/lib/posthog-server'

export const runtime = 'nodejs'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const URL_RE = /^https?:\/\/\S+$/i

type Body = {
  full_name?: string
  email?: string
  audience_size?: string
  audience_description?: string
  promotion_channels?: string[]
  website_url?: string
  linkedin_url?: string
  payout_method?: string
  payout_details?: string
}

function s(v: unknown): string {
  return typeof v === 'string' ? v.trim() : ''
}

export async function POST(req: NextRequest) {
  // ── 1. Auth: must be signed in (session_user_id cookie). ──────────────────
  const userId = req.cookies.get('session_user_id')?.value
  if (!userId) {
    return NextResponse.json({ error: 'Sign in to apply.' }, { status: 401 })
  }

  // ── 2. Rate limit by IP. ──────────────────────────────────────────────────
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  const { allowed } = await checkIpRateLimit(ip)
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests. Try again in a minute.' }, { status: 429 })
  }

  // ── 3. Parse + validate. ──────────────────────────────────────────────────
  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const fullName = s(body.full_name)
  const email = s(body.email).toLowerCase()
  const audienceSize = s(body.audience_size)
  const audienceDescription = s(body.audience_description)
  const websiteUrl = s(body.website_url)
  const linkedinUrl = s(body.linkedin_url)
  const payoutMethod = s(body.payout_method)
  const payoutDetails = s(body.payout_details)
  const channels = Array.isArray(body.promotion_channels)
    ? body.promotion_channels.map(s).filter(Boolean)
    : []

  if (fullName.length < 2) return NextResponse.json({ error: 'Share your name.' }, { status: 400 })
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: 'Share a valid email.' }, { status: 400 })
  if (!(AUDIENCE_SIZES as readonly string[]).includes(audienceSize))
    return NextResponse.json({ error: 'Pick an audience size.' }, { status: 400 })
  if (audienceDescription.length < 20 || audienceDescription.length > 600)
    return NextResponse.json({ error: 'Audience description must be 20–600 characters.' }, { status: 400 })
  if (!channels.length)
    return NextResponse.json({ error: 'Pick at least one channel.' }, { status: 400 })
  if (!channels.every(c => (PROMOTION_CHANNELS as readonly string[]).includes(c)))
    return NextResponse.json({ error: 'Unknown channel.' }, { status: 400 })
  if (websiteUrl && !URL_RE.test(websiteUrl))
    return NextResponse.json({ error: 'Website URL must start with http(s)://' }, { status: 400 })
  if (linkedinUrl && !URL_RE.test(linkedinUrl))
    return NextResponse.json({ error: 'LinkedIn URL must start with http(s)://' }, { status: 400 })
  if (!(PAYOUT_METHODS as readonly string[]).includes(payoutMethod))
    return NextResponse.json({ error: 'Pick a payout method.' }, { status: 400 })
  if (payoutDetails.length < 3 || payoutDetails.length > 200)
    return NextResponse.json({ error: 'Payout details must be 3–200 characters.' }, { status: 400 })

  // ── 4. Reject duplicate applications for the same user. ──────────────────
  const { data: existing } = await supabaseAdmin
    .from('affiliates')
    .select('id, status')
    .eq('user_id', userId)
    .maybeSingle()

  if (existing) {
    return NextResponse.json(
      { error: `You already have a${existing.status === 'pending' ? ' pending' : 'n'} application.` },
      { status: 409 },
    )
  }

  // ── 5. Generate a unique ref_code (3 attempts, then fail). ───────────────
  let refCode = ''
  for (let i = 0; i < 5; i++) {
    const candidate = generateRefCode(fullName)
    const { data: clash } = await supabaseAdmin
      .from('affiliates')
      .select('id')
      .eq('ref_code', candidate)
      .maybeSingle()
    if (!clash) {
      refCode = candidate
      break
    }
  }
  if (!refCode) {
    return NextResponse.json({ error: 'Could not generate a unique referral code. Try again.' }, { status: 500 })
  }

  // ── 6. Insert. ────────────────────────────────────────────────────────────
  const { data: inserted, error: insertErr } = await supabaseAdmin
    .from('affiliates')
    .insert({
      user_id: userId,
      email,
      full_name: fullName,
      ref_code: refCode,
      status: 'pending',
      commission_rate: AFFILIATE_COMMISSION_RATE,
      commission_duration_months: AFFILIATE_COMMISSION_DURATION_MONTHS,
      audience_size: audienceSize,
      audience_description: audienceDescription,
      promotion_channels: channels,
      website_url: websiteUrl || null,
      linkedin_url: linkedinUrl || null,
      payout_method: payoutMethod,
      payout_details: { raw: payoutDetails },
    })
    .select('*')
    .single()

  if (insertErr || !inserted) {
    console.error('[affiliate/apply] insert failed', insertErr)
    return NextResponse.json(
      { error: 'Could not save your application. Email partners@personalink.in.' },
      { status: 500 },
    )
  }

  // ── 7. Notification emails (best-effort — failures must not block the response). ──
  const record = inserted as AffiliateApplicationRecord
  const firstName = fullName.split(' ')[0] || fullName
  const emailResults = await Promise.allSettled([
    sendAffiliateApplicationAdminAlert(record),
    sendAffiliateApplicationAutoReply({ to: email, firstName }),
  ])
  emailResults.forEach((r, i) => {
    if (r.status === 'rejected') {
      console.error(`[affiliate/apply] email ${i === 0 ? 'admin' : 'auto-reply'} failed`, r.reason)
    }
  })

  // ── 8. Telemetry. ─────────────────────────────────────────────────────────
  try {
    getPostHogClient().capture({
      distinctId: userId,
      event: 'affiliate_application_submitted',
      properties: {
        audience_size: audienceSize,
        channels_count: channels.length,
        payout_method: payoutMethod,
      },
    })
  } catch (e) {
    console.error('[affiliate/apply] posthog capture failed', e)
  }

  return NextResponse.json({ ok: true })
}
