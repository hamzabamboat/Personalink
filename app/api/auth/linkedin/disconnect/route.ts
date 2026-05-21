import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

// Disconnect the user's LinkedIn account: clear the stored access token so we can
// no longer post on their behalf, then end the session (LinkedIn is the only login).
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await supabaseAdmin
      .from('users')
      .update({
        linkedin_access_token: null,
        linkedin_token_expires_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    const response = NextResponse.json({ ok: true })
    response.cookies.set('session_user_id', '', { maxAge: 0, path: '/' })
    response.cookies.set('sub_status', '', { maxAge: 0, path: '/' })
    response.cookies.set('used_code', '', { maxAge: 0, path: '/' })
    response.cookies.set('agency_mode', '', { maxAge: 0, path: '/' })
    return response
  } catch (err) {
    console.error('[auth/linkedin/disconnect]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
