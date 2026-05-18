import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getUserFromRequest } from '@/lib/auth'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL!
const REDIRECT_SUCCESS = `${APP_URL}/dashboard/calendar?gcal=connected`
const REDIRECT_ERROR = `${APP_URL}/dashboard/calendar?gcal=error`

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  const clearState = (res: NextResponse) => {
    res.cookies.delete('gcal_oauth_state')
    return res
  }

  if (error) {
    console.error('[gcal/callback] OAuth denied:', error)
    return clearState(NextResponse.redirect(REDIRECT_ERROR))
  }

  const storedState = request.cookies.get('gcal_oauth_state')?.value
  if (!state || !storedState || state !== storedState) {
    console.error('[gcal/callback] state mismatch')
    return clearState(NextResponse.redirect(REDIRECT_ERROR))
  }

  if (!code) {
    return clearState(NextResponse.redirect(REDIRECT_ERROR))
  }

  const user = await getUserFromRequest(request)
  if (!user) {
    return clearState(NextResponse.redirect(`${APP_URL}/login`))
  }

  try {
    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    if (!clientId || !clientSecret) throw new Error('Google OAuth not configured')

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: `${APP_URL}/api/auth/google-calendar/callback`,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    })

    if (!tokenRes.ok) {
      const body = await tokenRes.text()
      console.error('[gcal/callback] token exchange failed:', tokenRes.status, body)
      return clearState(NextResponse.redirect(REDIRECT_ERROR))
    }

    const tokens = await tokenRes.json()
    if (!tokens.access_token || !tokens.refresh_token) {
      console.error('[gcal/callback] missing tokens:', Object.keys(tokens))
      return clearState(NextResponse.redirect(REDIRECT_ERROR))
    }

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

    await supabaseAdmin
      .from('users')
      .update({
        google_calendar_access_token: tokens.access_token,
        google_calendar_refresh_token: tokens.refresh_token,
        google_calendar_token_expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    const response = NextResponse.redirect(REDIRECT_SUCCESS)
    response.cookies.delete('gcal_oauth_state')
    return response
  } catch (err) {
    console.error('[gcal/callback] unhandled error:', err)
    return clearState(NextResponse.redirect(REDIRECT_ERROR))
  }
}
