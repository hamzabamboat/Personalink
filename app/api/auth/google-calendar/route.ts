import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getUserFromRequest } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const appUrl = process.env.NEXT_PUBLIC_APP_URL

  if (!clientId || !appUrl) {
    return NextResponse.redirect(`${appUrl ?? '/dashboard/calendar'}?error=server_misconfigured`)
  }

  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.redirect(`${appUrl}/login?error=not_logged_in`)
  }

  const redirectUri = `${appUrl}/api/auth/google-calendar/callback`
  const state = crypto.randomUUID()

  const cookieStore = await cookies()
  cookieStore.set('gcal_oauth_state', state, {
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
  authUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/calendar.events')
  authUrl.searchParams.set('state', state)
  // Required to receive a refresh_token
  authUrl.searchParams.set('access_type', 'offline')
  // Always show consent screen so we always get a refresh_token
  authUrl.searchParams.set('prompt', 'consent')

  return NextResponse.redirect(authUrl.toString())
}
