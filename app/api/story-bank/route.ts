import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getUserFromRequest } from '@/lib/auth'
import { checkLimit, incrementUsage, logViolation } from '@/lib/usage-limits'

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('story_bank')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ stories: data })
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('plan')
    .eq('user_id', user.id)
    .maybeSingle()

  const plan = profile?.plan || 'starter'

  // Check story_entries limit
  const entryCheck = await checkLimit(user.id, plan, 'story_entries')
  if (!entryCheck.allowed) {
    await logViolation(user.id, 'story_entries', plan)
    return NextResponse.json({
      error: `You've reached your story bank limit (${entryCheck.limit} entries/month).`,
      feature: 'story_entries',
      used: entryCheck.used,
      limit: entryCheck.limit,
      plan,
    }, { status: 429 })
  }

  const { raw_text, title } = await request.json()
  if (!raw_text?.trim()) return NextResponse.json({ error: 'Story text is required' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('story_bank')
    .insert({ user_id: user.id, raw_text, title: title || null, status: 'raw' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await incrementUsage(user.id, 'story_entries')
  return NextResponse.json({ story: data })
}

export async function DELETE(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

  await supabaseAdmin.from('story_bank').delete().eq('id', id).eq('user_id', user.id)
  return NextResponse.json({ success: true })
}
