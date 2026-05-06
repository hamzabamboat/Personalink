// Vercel cron — runs every Monday at 9am UTC (see vercel.json)
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getTrendsForProfile, getPostInsights } from '@/lib/trends'
import { sendWeeklyDigestEmail } from '@/lib/email'
import { UserProfile } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Fetch all users with email + active or trial status
  const { data: users, error } = await supabaseAdmin
    .from('users')
    .select('id, email, linkedin_name, subscription_status, trial_posts_used')
    .not('email', 'is', null)

  if (error) {
    console.error('Weekly digest: failed to fetch users', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const results = await Promise.allSettled(
    (users ?? []).map(async (user) => {
      if (!user.email) return { id: user.id, status: 'skipped', reason: 'no_email' }

      const { data: profile } = await supabaseAdmin
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!profile) return { id: user.id, status: 'skipped', reason: 'no_profile' }

      const [trends, insights] = await Promise.all([
        getTrendsForProfile(profile as UserProfile),
        getPostInsights(user.id),
      ])

      const trendingTopics = trends.postIdeas.slice(0, 3).map(idea => ({
        title: idea.title,
        angle: idea.angle,
      }))

      if (!trendingTopics.length) return { id: user.id, status: 'skipped', reason: 'no_trends' }

      await sendWeeklyDigestEmail({
        to: user.email,
        userName: user.linkedin_name || 'there',
        trendingTopics,
        postInsight: insights.insight,
        scheduledCount: insights.scheduledCount,
      })

      return { id: user.id, status: 'sent' }
    })
  )

  const summary = results.map((r, i) =>
    r.status === 'fulfilled' ? r.value : { id: users![i].id, status: 'error', reason: String(r.reason) }
  )

  const sent = summary.filter(r => r && 'status' in r && r.status === 'sent').length
  console.log(`Weekly digest: ${sent}/${users?.length} emails sent`)
  return NextResponse.json({ sent, total: users?.length, results: summary })
}
