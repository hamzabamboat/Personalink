import { NextRequest, NextResponse } from 'next/server'
import { createMagicLinkToken, isEmailRateLimited } from '@/lib/magic-link'
import { sendMagicLinkEmail } from '@/lib/email'
import { getPostHogClient } from '@/lib/posthog-server'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const APP_URL = process.env.NEXT_PUBLIC_APP_URL!

export async function POST(request: NextRequest) {
  let body: { email?: string; voiceReportToken?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 })
  }

  const email = (body.email || '').trim().toLowerCase()
  const voiceReportToken = (body.voiceReportToken || '').trim()
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ ok: false, error: 'Enter a valid email.' }, { status: 400 })
  }
  const reportToken = UUID_RE.test(voiceReportToken) ? voiceReportToken : null

  if (await isEmailRateLimited(email)) {
    return NextResponse.json({ ok: false, error: 'Too many requests. Try again in a few minutes.' }, { status: 429 })
  }

  const token = await createMagicLinkToken({ email, voiceReportToken: reportToken })
  const verifyUrl = `${APP_URL}/api/auth/magic-link/verify?token=${token}`

  try {
    await sendMagicLinkEmail({ to: email, verifyUrl })
  } catch (err) {
    console.error('[magic-link/request] send failed', err)
    return NextResponse.json({ ok: false, error: 'Could not send the email. Try again.' }, { status: 500 })
  }

  try {
    getPostHogClient().capture({
      distinctId: email,
      event: 'email_captured',
      properties: { source: 'voice_analyzer', has_report: !!reportToken },
    })
  } catch { /* posthog optional */ }

  return NextResponse.json({ ok: true })
}
