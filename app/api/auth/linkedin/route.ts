// IMPORTANT — LinkedIn Developer Portal setup required:
// Your app needs TWO products enabled:
//   1. "Sign In with LinkedIn using OpenID Connect" → gives openid, profile, email scopes
//   2. "Share on LinkedIn" → gives w_member_social scope
// Add both at: https://www.linkedin.com/developers/apps → Your App → Products
// Without the OIDC product, LinkedIn rejects the openid/profile/email scopes → error=access_denied
//
// NOTE: the Organic Growth Engine analytics scopes (r_member_postAnalytics,
// r_member_profileAnalytics) are intentionally NOT requested here — they need
// LinkedIn approval that is still pending, and requesting them rejects the whole
// authorization (breaks sign-in for everyone). See buildLinkedInAuthScope below.

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { buildLinkedInAuthScope } from '@/lib/linkedin-analytics'

export async function GET() {
  const clientId = process.env.LINKEDIN_CLIENT_ID!
  const redirectUri = 'https://www.personalink.in/api/auth/linkedin/callback'
  // Analytics scopes withheld until LinkedIn approval lands; flip to buildLinkedInAuthScope(true) then.
  const scope = buildLinkedInAuthScope()
  const state = crypto.randomUUID()

  const cookieStore = await cookies()
  cookieStore.set('linkedin_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 min to complete OAuth
    path: '/',
  })

  const authUrl = new URL('https://www.linkedin.com/oauth/v2/authorization')
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('scope', scope)
  authUrl.searchParams.set('state', state)

  return NextResponse.redirect(authUrl.toString())
}
