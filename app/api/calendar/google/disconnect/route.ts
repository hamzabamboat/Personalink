import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getUserFromRequest } from '@/lib/auth'

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Clear all Google Calendar tokens — events already in Google Calendar
  // remain there (user can delete them manually if they wish)
  const { error } = await supabaseAdmin
    .from('users')
    .update({
      google_calendar_access_token: null,
      google_calendar_refresh_token: null,
      google_calendar_token_expires_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)

  if (error) {
    console.error('[gcal/disconnect]', error)
    return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 })
  }

  // Also clear all stored event IDs since we can no longer manage them
  await supabaseAdmin
    .from('posts')
    .update({ google_calendar_event_id: null })
    .eq('user_id', user.id)

  return NextResponse.json({ success: true })
}
