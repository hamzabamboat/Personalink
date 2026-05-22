import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getUserFromRequest } from '@/lib/auth'
import { syncPostToCalendar, removePostFromCalendar } from '@/lib/google-calendar'
import { addVoiceSample } from '@/lib/voice'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return PATCH(request, { params })
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    if (!id) return NextResponse.json({ error: 'Post ID required' }, { status: 400 })

    const body = await request.json().catch(() => null)
    if (!body) return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })

    const { content, scheduled_at, image_urls } = body
    if (content !== undefined && typeof content !== 'string') {
      return NextResponse.json({ error: 'Content must be a string' }, { status: 400 })
    }

    if (scheduled_at) {
      const minAllowed = new Date(Date.now() + 30 * 60 * 1000)
      if (new Date(scheduled_at) < minAllowed) {
        return NextResponse.json({ error: 'Posts must be scheduled at least 30 minutes from now' }, { status: 400 })
      }
    }

    // Capture the previous content so we can tell whether the human actually edited it
    let previousContent: string | null = null
    if (content !== undefined) {
      const { data: existing } = await supabaseAdmin
        .from('posts')
        .select('content')
        .eq('id', id)
        .eq('user_id', user.id)
        .maybeSingle()
      previousContent = existing?.content ?? null
    }

    const updatePayload: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (content !== undefined) updatePayload.content = content
    if (scheduled_at !== undefined) updatePayload.scheduled_at = scheduled_at || null
    if (image_urls !== undefined) updatePayload.image_urls = Array.isArray(image_urls) ? image_urls : null

    const { data, error } = await supabaseAdmin
      .from('posts')
      .update(updatePayload)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // A human-edited draft is the strongest voice signal — add it to the corpus
    // (only when the content meaningfully changed from what was there before).
    if (
      content !== undefined &&
      typeof content === 'string' &&
      content.trim().length >= 120 &&
      content.trim() !== (previousContent ?? '').trim()
    ) {
      addVoiceSample(user.id, content, 'edit').catch(() => { /* non-fatal */ })
    }

    // Fire-and-forget: sync to Google Calendar if scheduled_at changed
    if (scheduled_at !== undefined) {
      if (scheduled_at && data.content) {
        syncPostToCalendar(user.id, {
          id: data.id,
          content: data.content,
          scheduled_at: data.scheduled_at,
          google_calendar_event_id: data.google_calendar_event_id ?? null,
        })
      } else if (!scheduled_at && data.google_calendar_event_id) {
        // Post was unscheduled — remove from calendar
        removePostFromCalendar(user.id, {
          id: data.id,
          google_calendar_event_id: data.google_calendar_event_id,
        })
      }
    }

    return NextResponse.json({ post: data })
  } catch (error) {
    console.error('[posts update]', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    if (!id) return NextResponse.json({ error: 'Post ID required' }, { status: 400 })

    // Fetch the event ID before deleting so we can clean up Google Calendar
    const { data: post } = await supabaseAdmin
      .from('posts')
      .select('google_calendar_event_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    const { error } = await supabaseAdmin.from('posts').delete().eq('id', id).eq('user_id', user.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Fire-and-forget: remove from Google Calendar if event exists
    if (post?.google_calendar_event_id) {
      removePostFromCalendar(user.id, { id, google_calendar_event_id: post.google_calendar_event_id })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[posts delete]', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
