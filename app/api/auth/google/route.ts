import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID!
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`
  const state = crypto.randomUUID()

  const cookieStore = await cookies()
  cookieStore.set('google_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  })

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('scope', 'openid email profile')
  authUrl.searchParams.set('state', state)

  return NextResponse.redirect(authUrl.toString())
}
