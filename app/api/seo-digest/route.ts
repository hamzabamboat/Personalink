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

  // Two accepted body formats:
  //   • application/json            → { subject, body }
  //   • anything else (text/plain)  → the raw request body IS the digest; the
  //     subject comes from the X-Digest-Subject header.
  // The raw-text path exists because the remote routine builds a large digest full
  // of box-drawing chars, emoji and URLs; JSON-escaping that inside a shell curl is
  // fragile and was silently failing at run time (→ unwanted Gmail-draft fallback).
  let body: string
  let subject: string
  if ((req.headers.get('content-type') ?? '').includes('application/json')) {
    let payload: { subject?: string; body?: string }
    try {
      payload = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }
    body = (payload.body ?? '').trim()
    subject = (payload.subject ?? 'PersonaLink — weekly off-page SEO digest').slice(0, 200)
  } else {
    body = (await req.text()).trim()
    subject = (req.headers.get('x-digest-subject') ?? 'PersonaLink — weekly off-page SEO digest').slice(0, 200)
  }

  if (!body) {
    return NextResponse.json({ error: 'Missing digest body' }, { status: 400 })
  }

  try {
    await sendAdminAlert({ subject, body })
  } catch (err) {
    return NextResponse.json({ error: 'Email send failed', detail: String(err) }, { status: 502 })
  }

  return NextResponse.json({ ok: true })
}
