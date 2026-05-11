import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getUserFromRequest } from '@/lib/auth'

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

    const { error } = await supabaseAdmin.from('posts').delete().eq('id', id).eq('user_id', user.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[posts delete]', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
