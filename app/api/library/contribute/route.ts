import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'

// Read the user's "contribute my top posts to the library" opt-in.
export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data } = await supabaseAdmin
    .from('user_profiles').select('contribute_to_library').eq('user_id', user.id).maybeSingle()
  return NextResponse.json({ enabled: !!data?.contribute_to_library })
}

// Set the opt-in.
export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { enabled } = await request.json().catch(() => ({} as { enabled?: boolean }))
  await supabaseAdmin
    .from('user_profiles').update({ contribute_to_library: !!enabled }).eq('user_id', user.id)
  return NextResponse.json({ ok: true, enabled: !!enabled })
}
