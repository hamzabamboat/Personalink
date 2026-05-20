import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { isTokenExpired } from '@/lib/linkedin-api'
import { getUserFromRequest } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const authUser = await getUserFromRequest(request)
  if (!authUser) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: user, error } = await supabaseAdmin
    .from('users')
    .select('linkedin_access_token, linkedin_token_expires_at, linkedin_name, linkedin_picture, linkedin_headline')
    .eq('id', authUser.id)
    .single()

  if (error || !user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  if (!user.linkedin_access_token || isTokenExpired(user.linkedin_token_expires_at)) {
    return NextResponse.json({ error: 'LinkedIn token expired — please reconnect' }, { status: 401 })
  }

  const res = await fetch('https://api.linkedin.com/v2/userinfo', {
    headers: { Authorization: `Bearer ${user.linkedin_access_token}` },
  })

  if (!res.ok) {
    return NextResponse.json({ error: `LinkedIn API error: ${res.status}` }, { status: 502 })
  }

  const profile = await res.json()
  const headline: string | undefined = profile.headline ?? profile.job_title ?? undefined

  // Persist headline if LinkedIn returned one
  if (headline && headline !== user.linkedin_headline) {
    await supabaseAdmin
      .from('users')
      .update({ linkedin_headline: headline, updated_at: new Date().toISOString() })
      .eq('id', authUser.id)
  }

  const { data: savedProfile } = await supabaseAdmin
    .from('user_profiles')
    .select('current_about, current_skills')
    .eq('user_id', authUser.id)
    .maybeSingle()

  return NextResponse.json({
    name: profile.name ?? user.linkedin_name,
    picture: profile.picture ?? user.linkedin_picture,
    headline: headline ?? user.linkedin_headline ?? null,
    current_about: savedProfile?.current_about ?? null,
    current_skills: savedProfile?.current_skills ?? [],
  })
}
