import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getUserFromRequest } from '@/lib/auth'
import { checkLimit, incrementUsage, logViolation } from '@/lib/usage-limits'

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabaseAdmin
      .from('story_bank')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ stories: data })
  } catch (error) {
    console.error('[story-bank GET]', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json().catch(() => null)
    if (!body) return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })

    const { raw_text, title } = body
    if (!raw_text?.trim()) return NextResponse.json({ error: 'Story text is required' }, { status: 400 })
    if (raw_text.length > 10000) return NextResponse.json({ error: 'Story text too long (max 10,000 characters)' }, { status: 400 })

    const { data: profile } = await supabaseAdmin.from('user_profiles').select('plan').eq('user_id', user.id).maybeSingle()
    const plan = profile?.plan || 'starter'

    const entryCheck = await checkLimit(user.id, plan, 'story_entries')
    if (!entryCheck.allowed) {
      await logViolation(user.id, 'story_entries', plan)
      return NextResponse.json({ error: `You've reached your story bank limit (${entryCheck.limit} entries/month).`, feature: 'story_entries', used: entryCheck.used, limit: entryCheck.limit, plan }, { status: 429 })
    }

    const { data, error } = await supabaseAdmin
      .from('story_bank')
      .insert({ user_id: user.id, raw_text: raw_text.trim(), title: title?.trim() || null, status: 'raw' })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    await incrementUsage(user.id, 'story_entries')
    return NextResponse.json({ story: data })
  } catch (error) {
    console.error('[story-bank POST]', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

    const { error } = await supabaseAdmin.from('story_bank').delete().eq('id', id).eq('user_id', user.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[story-bank DELETE]', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
