import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { ingestForUser } from '@/lib/library'

export const runtime = 'nodejs'
export const maxDuration = 60

// Turn the user's top-performing posts into anonymized library patterns.
// Self-serve (a user ingests their own posts); requires the contribute opt-in.
export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabaseAdmin
    .from('user_profiles').select('contribute_to_library').eq('user_id', user.id).maybeSingle()
  if (!profile?.contribute_to_library) {
    return NextResponse.json({ error: 'Enable “contribute my top posts” first.', needsOptIn: true }, { status: 403 })
  }

  const inserted = await ingestForUser(user.id)
  return NextResponse.json({ inserted })
}
