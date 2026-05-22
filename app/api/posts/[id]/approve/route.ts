import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params

    const { data: post, error } = await supabaseAdmin
      .from('posts')
      .select('id, status, scheduled_at, user_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error || !post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    if (!['pending_approval', 'draft'].includes(post.status)) {
      return NextResponse.json({ error: 'Post cannot be approved in its current state' }, { status: 409 })
    }

    // If the post already has a scheduled time, move it straight to scheduled
    const newStatus = post.scheduled_at ? 'scheduled' : 'approved'

    const { data: updated } = await supabaseAdmin
      .from('posts')
      .update({ status: newStatus, human_approved: true, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    return NextResponse.json({ post: updated })
  } catch (err) {
    console.error('[posts/approve]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
