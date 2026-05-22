import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

// Self-service account deletion. A single users-row delete cascades to the
// profile, posts, and all related rows via DB foreign keys, so this is fast.
export async function DELETE(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { error } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', user.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Clear the session so the user is signed out immediately.
    const response = NextResponse.json({ ok: true })
    for (const name of ['session_user_id', 'sub_status', 'trial_ends_at', 'used_code', 'agency_mode']) {
      response.cookies.set(name, '', { maxAge: 0, path: '/' })
    }
    return response
  } catch (err) {
    console.error('[account/delete]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
