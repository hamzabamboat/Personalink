import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { supabaseAdmin } from '@/lib/supabase-admin'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL!

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
  if (!token?.googleId) {
    return NextResponse.redirect(`${APP_URL}/?error=google_failed`)
  }

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('google_id', token.googleId as string)
    .maybeSingle()

  if (!user) return NextResponse.redirect(`${APP_URL}/?error=google_failed`)

  const { data: existingProfile } = await supabaseAdmin
    .from('user_profiles')
    .select('onboarding_completed_at')
    .eq('user_id', user.id)
    .maybeSingle()

  const redirectTo = !existingProfile?.onboarding_completed_at
    ? `${APP_URL}/onboarding`
    : `${APP_URL}/dashboard`

  const response = NextResponse.redirect(redirectTo)
  response.cookies.set('session_user_id', user.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  })
  return response
}
