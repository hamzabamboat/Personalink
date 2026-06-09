import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

// Marks the first-run tour as finished/skipped so it never auto-starts again.
export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const now = new Date().toISOString()
  const { error } = await supabaseAdmin
    .from('user_profiles')
    .update({ tour_completed_at: now, updated_at: now })
    .eq('user_id', user.id)

  if (error) {
    console.error('[me/tour]', error)
    return NextResponse.json({ error: 'Failed to save tour state' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
