// Vercel cron job — runs every 15 minutes (see vercel.json)
// Protect with CRON_SECRET to prevent unauthorized calls

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { publishToLinkedIn, isTokenExpired } from '@/lib/linkedin-api'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date().toISOString()

  const { data: posts, error } = await supabaseAdmin
    .from('posts')
    .select('*, users(*)')
    .eq('status', 'scheduled')
    .lte('scheduled_at', now)
    .limit(20)

  if (error) {
    console.error('Cron query error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const results = await Promise.allSettled(
    (posts ?? []).map(async (post) => {
      const user = post.users as {
        linkedin_access_token: string | null
        linkedin_token_expires_at: string | null
        linkedin_id: string
      }

      if (!user.linkedin_access_token || isTokenExpired(user.linkedin_token_expires_at)) {
        await supabaseAdmin
          .from('posts')
          .update({ status: 'failed', failure_reason: 'LinkedIn token expired' })
          .eq('id', post.id)
        return { id: post.id, status: 'failed', reason: 'token_expired' }
      }

      await supabaseAdmin
        .from('posts')
        .update({ status: 'publishing' })
        .eq('id', post.id)

      const linkedinPostId = await publishToLinkedIn({
        accessToken: user.linkedin_access_token,
        linkedinId: user.linkedin_id,
        content: post.content,
      })

      await supabaseAdmin
        .from('posts')
        .update({
          status: 'published',
          linkedin_post_id: linkedinPostId,
          published_at: new Date().toISOString(),
        })
        .eq('id', post.id)

      return { id: post.id, status: 'published' }
    })
  )

  const summary = results.map((r, i) =>
    r.status === 'fulfilled' ? r.value : { id: posts![i].id, status: 'error', reason: String(r.reason) }
  )

  console.log('Cron publish results:', summary)
  return NextResponse.json({ processed: summary.length, results: summary })
}
