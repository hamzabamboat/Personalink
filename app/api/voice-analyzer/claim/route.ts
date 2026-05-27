import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const VA_COOKIE_MAX_AGE = 60 * 30 // 30 minutes — long enough for the OAuth round-trip

type ClaimBody = { token?: string; email?: string }
type ClaimResponse =
  | { ok: true; redirect_to: string }
  | { ok: false; error: string }

export async function POST(request: NextRequest): Promise<NextResponse<ClaimResponse>> {
  let body: ClaimBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 })
  }

  const token = (body.token || '').trim()
  const email = (body.email || '').trim().toLowerCase()

  if (!UUID_RE.test(token)) {
    return NextResponse.json({ ok: false, error: 'Invalid report token.' }, { status: 400 })
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ ok: false, error: 'Enter a valid email.' }, { status: 400 })
  }

  // If this email is already a user, link the report to that user so signup picks up the fingerprint
  const { data: existingUser } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('email', email)
    .maybeSingle()

  const { data: report } = await supabaseAdmin
    .from('voice_reports')
    .select('id')
    .eq('token', token)
    .maybeSingle()

  if (!report) {
    return NextResponse.json({ ok: false, error: 'Report not found.' }, { status: 404 })
  }

  const { error } = await supabaseAdmin
    .from('voice_reports')
    .update({
      email,
      converted_user_id: existingUser?.id ?? null,
    })
    .eq('token', token)

  if (error) {
    console.error('[voice-analyzer.claim] update failed:', error)
    return NextResponse.json({ ok: false, error: 'Could not save email. Try again.' }, { status: 500 })
  }

  // Stash the email in an httpOnly cookie so the LinkedIn callback can match
  // this person to their voice_reports row even if their LinkedIn email differs
  // from what they typed at the gate. Server-set, not readable by JS, gone in 30 min.
  const response = NextResponse.json<ClaimResponse>({ ok: true, redirect_to: '/?from=voice-analyzer' })
  response.cookies.set('pl_va_email', email, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: VA_COOKIE_MAX_AGE,
    path: '/',
  })
  return response
}
