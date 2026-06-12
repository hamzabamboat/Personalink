import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getUserFromRequest } from '@/lib/auth'
import { syncPostToCalendar } from '@/lib/google-calendar'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const body = await request.json().catch(() => null)
    const scheduledAt = body?.scheduledAt

    const minAllowed = new Date(Date.now() + 30 * 60 * 1000)
    if (!scheduledAt || new Date(scheduledAt) < minAllowed) {
      return NextResponse.json({ error: 'Posts must be scheduled at least 30 minutes from now' }, { status: 400 })
    }

    const { data: post } = await supabaseAdmin
      .from('posts')
      .select('status, user_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 })

    // Includes 'scheduled' (overdue) and 'failed' so the Reschedule action works.
    // The "≥ 30 minutes from now" check above guarantees a future time.
    if (!['approved', 'draft', 'pending_approval', 'scheduled', 'failed'].includes(post.status)) {
      return NextResponse.json(
        { error: "This post can't be scheduled from its current state." },
        { status: 400 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from('posts')
      .update({
        status: 'scheduled',
        scheduled_at: scheduledAt,
        human_approved: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Fire-and-forget: sync to Google Calendar if user has it connected
    syncPostToCalendar(user.id, {
      id: data.id,
      content: data.content,
      scheduled_at: data.scheduled_at,
      google_calendar_event_id: data.google_calendar_event_id ?? null,
    })

    return NextResponse.json({ post: data })
  } catch (err) {
    console.error('[posts/schedule]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
