import { NextRequest, NextResponse } from 'next/server'
import { consumeMagicLinkToken } from '@/lib/magic-link'
import { findOrCreateEmailUser, seedVoiceFromReport } from '@/lib/email-auth'
import { sendEmailSignupWelcomeEmail } from '@/lib/email'
import { getPostHogClient } from '@/lib/posthog-server'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL!

export async function GET(request: NextRequest) {
  const token = new URL(request.url).searchParams.get('token') || ''

  const verified = await consumeMagicLinkToken(token)
  if (!verified) {
    return NextResponse.redirect(`${APP_URL}/?error=magic_link_invalid`)
  }

  const { userId, isNew } = await findOrCreateEmailUser(verified.email)

  if (isNew) {
    await seedVoiceFromReport(userId, verified.voiceReportToken, verified.email)
    sendEmailSignupWelcomeEmail({ to: verified.email }).catch(console.error)
  }

  try {
    const ph = getPostHogClient()
    ph.identify({ distinctId: userId, properties: { email: verified.email } })
    ph.capture({
      distinctId: userId,
      event: isNew ? 'user_signed_up' : 'user_logged_in',
      properties: { provider: 'email_magic_link', is_new_user: isNew },
    })
  } catch { /* posthog optional */ }

  const response = NextResponse.redirect(`${APP_URL}/welcome`)
  response.cookies.set('session_user_id', userId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  })
  return response
}
