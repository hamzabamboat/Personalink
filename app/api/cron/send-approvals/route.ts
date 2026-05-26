import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendApprovalEmail } from '@/lib/email'

// Runs once daily at 3:00 AM UTC (8:30 AM IST) via Vercel cron.
// Sends approval emails for all pending posts scheduled to go live within
// the next 24 hours that haven't had an email sent yet.
// Users get their approval email in the morning, well before posting time.

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const windowStart = now  // include posts scheduled from now onward
  const windowEnd   = new Date(now.getTime() + 24 * 60 * 60 * 1000) // up to 24 hours out

  // Find pending_approval posts scheduled within the next 24 hours
  const { data: posts, error } = await supabaseAdmin
    .from('posts')
    .select('id, user_id, content, approval_token, scheduled_at')
    .eq('status', 'pending_approval')
    .is('approval_sent_at', null)
    .gte('scheduled_at', windowStart.toISOString())
    .lte('scheduled_at', windowEnd.toISOString())
    .limit(50)

  if (error) {
    console.error('[send-approvals] query error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!posts?.length) {
    return NextResponse.json({ sent: 0 })
  }

  // Fetch user details for each unique user_id
  const userIds = [...new Set(posts.map((p: { user_id: string }) => p.user_id))]
  const { data: users } = await supabaseAdmin
    .from('users')
    .select('id, email, linkedin_name, subscription_status')
    .in('id', userIds)

  const userMap = new Map((users || []).map((u: { id: string; email: string; linkedin_name?: string; subscription_status?: string | null }) => [u.id, u]))

  let sent = 0
  const errors: string[] = []

  for (const post of posts) {
    const user = userMap.get(post.user_id)
    if (!user?.email || !post.approval_token) continue

    // Skip approval emails for users without an active subscription.
    // access_code users are entitled to the same email flow.
    const activeStatuses = ['active', 'trialing', 'access_code']
    if (!activeStatuses.includes(user.subscription_status ?? '')) continue

    try {
      await sendApprovalEmail({
        to: user.email,
        userName: user.linkedin_name || 'there',
        postContent: post.content,
        approvalToken: post.approval_token,
        scheduledAt: post.scheduled_at,
      })

      await supabaseAdmin
        .from('posts')
        .update({ approval_sent_at: now.toISOString() })
        .eq('id', post.id)

      sent++
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      errors.push(`post ${post.id}: ${msg}`)
      console.error('[send-approvals] email error for post', post.id, msg)
    }
  }

  return NextResponse.json({ sent, errors: errors.length ? errors : undefined })
}
