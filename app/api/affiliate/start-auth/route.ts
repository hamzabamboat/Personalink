import { NextResponse } from 'next/server'

/**
 * POSTed by the "Continue with LinkedIn" button on /affiliate/apply when the
 * viewer is not signed in. Sets a short-lived intent cookie so the LinkedIn
 * callback knows to bounce them back here instead of /dashboard, then forwards
 * to the existing /api/auth/linkedin entry point.
 */
export async function POST() {
  const res = NextResponse.redirect(
    new URL('/api/auth/linkedin', process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.personalink.in'),
    { status: 303 },
  )
  res.cookies.set('pl_post_auth_intent', 'affiliate_apply', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 600, // 10 min — same as the LinkedIn OAuth state cookie
  })
  return res
}
