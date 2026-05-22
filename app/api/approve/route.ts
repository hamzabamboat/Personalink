import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// Called from email approval links: /approve/[token]?action=approve|reject
// This route handles the actual DB update
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    if (!body?.token || !['approve', 'reject'].includes(body.action)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }
    const { token, action } = body

    const { data: post, error } = await supabaseAdmin
      .from('posts')
      .select('id, status, scheduled_at')
      .eq('approval_token', token)
      .single()

    if (error || !post) {
      return NextResponse.json({ error: 'Invalid or expired approval link' }, { status: 404 })
    }

    if (!['draft', 'pending_approval'].includes(post.status)) {
      return NextResponse.json(
        { error: 'This post has already been processed', status: post.status },
        { status: 409 }
      )
    }

    const now = new Date().toISOString()
    // Keep the pre-assigned scheduled_at; only fall back to now if none was set
    const scheduledAt = post.scheduled_at ?? now
    const update =
      action === 'approve'
        ? { status: 'scheduled', scheduled_at: scheduledAt, human_approved: true, updated_at: now }
        : { status: 'rejected', updated_at: now }

    await supabaseAdmin
      .from('posts')
      .update(update)
      .eq('id', post.id)

    return NextResponse.json({ success: true, status: update.status })
  } catch (err) {
    console.error('[approve]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
