import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// Called from email approval links: /approve/[token]?action=approve|reject
// This route handles the actual DB update
export async function POST(request: NextRequest) {
  const { token, action } = await request.json()

  if (!token || !['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { data: post, error } = await supabaseAdmin
    .from('posts')
    .select('id, status')
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

  const newStatus = action === 'approve' ? 'approved' : 'rejected'
  await supabaseAdmin
    .from('posts')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', post.id)

  return NextResponse.json({ success: true, status: newStatus })
}
