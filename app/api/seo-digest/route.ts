import { NextRequest, NextResponse } from 'next/server'
import { sendAdminAlert } from '@/lib/email'

export const runtime = 'nodejs'

// Token-protected delivery endpoint for the weekly off-page SEO routine.
// The routine is a remote agent with no secrets, so it can't send email itself.
// It POSTs { subject, body } here with a Bearer token; this route runs on the
// deployed app (which holds RESEND_API_KEY) and forwards the digest to the
// founder's inbox via the existing sendAdminAlert helper (→ ADMIN_EMAIL).
export async function POST(req: NextRequest) {
  const token = process.env.SEO_DIGEST_TOKEN
  const auth = req.headers.get('authorization')
  if (!token || auth !== `Bearer ${token}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let payload: { subject?: string; body?: string }
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const body = (payload.body ?? '').trim()
  if (!body) {
    return NextResponse.json({ error: 'Missing "body"' }, { status: 400 })
  }
  const subject = (payload.subject ?? 'PersonaLink — weekly off-page SEO digest').slice(0, 200)

  try {
    await sendAdminAlert({ subject, body })
  } catch (err) {
    return NextResponse.json({ error: 'Email send failed', detail: String(err) }, { status: 502 })
  }

  return NextResponse.json({ ok: true })
}
