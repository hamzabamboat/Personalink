import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getUserFromRequest } from '@/lib/auth'
import { sendApprovalEmail } from '@/lib/email'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params

    const { data: post, error } = await supabaseAdmin
      .from('posts')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error || !post) return NextResponse.json({ error: 'Post not found' }, { status: 404 })

    if (!user.email) {
      return NextResponse.json({ error: 'No email on your account' }, { status: 400 })
    }

    await supabaseAdmin
      .from('posts')
      .update({ status: 'pending_approval', approval_sent_at: new Date().toISOString() })
      .eq('id', id)

    await sendApprovalEmail({
      to: user.email,
      userName: user.linkedin_name || 'there',
      postContent: post.content,
      approvalToken: post.approval_token!,
      scheduledAt: post.scheduled_at ?? null,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[posts/send-approval]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
