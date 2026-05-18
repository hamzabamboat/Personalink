import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getUserFromRequest } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabaseAdmin
    .from('users')
    .select('google_calendar_refresh_token')
    .eq('id', user.id)
    .single()

  return NextResponse.json({ connected: !!data?.google_calendar_refresh_token })
}
