// Vercel cron — weekly (Mon 08:00 UTC). Per active user: send the attributable
// growth report and run plateau detection (re-opening optimization experiments
// when warranted). Idempotent per day via cron_locks (mirrors day7-stats);
// per-user throttle via user_profiles.growth_report_sent_at (≤ 1/week).
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendGrowthReportEmail } from '@/lib/email'
import { buildGrowthReportForUser } from '@/lib/growth-report'
import { maybeOpenPlateauExperiment } from '@/lib/plateau'
import crypto from 'crypto'

export const maxDuration = 60

async function handler(request: NextRequest) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = new Date().toISOString().slice(0, 10)
  const lockId = crypto.randomUUID()
  const { error: lockError } = await supabaseAdmin
    .from('cron_locks')
    .insert({ job_name: 'growth-report', run_date: today, lock_id: lockId })
  if (lockError) return NextResponse.json({ skipped: true, reason: 'already_ran_today' })

  // Active users = posted at least once in the last 28 days. One query for the
  // distinct user_ids, then per-user build/send.
  const since = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString()
  const { data: recentPosts } = await supabaseAdmin
    .from('posts')
    .select('user_id')
    .eq('status', 'published')
    .gte('published_at', since)
  const activeUserIds = [...new Set((recentPosts ?? []).map(p => p.user_id as string))]

  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const results = await Promise.allSettled(activeUserIds.map(async (userId) => {
    const { data: user } = await supabaseAdmin
      .from('users').select('email, linkedin_name').eq('id', userId).maybeSingle()
    if (!user?.email) return { userId, skipped: 'no_email' }

    const { data: profile } = await supabaseAdmin
      .from('user_profiles').select('growth_report_sent_at, name').eq('user_id', userId).maybeSingle()
    if (profile?.growth_report_sent_at && profile.growth_report_sent_at > oneWeekAgo) {
      return { userId, skipped: 'sent_this_week' }
    }

    const firstName = (profile?.name || user.linkedin_name || 'there').split(' ')[0]
    const report = await buildGrowthReportForUser(userId, firstName)

    // Plateau detection runs regardless of whether we email (best-effort, non-fatal).
    const plateau = await maybeOpenPlateauExperiment(userId).catch(() => ({ opened: false, reason: 'error' }))

    if (!report.hasData) return { userId, skipped: 'no_posts_in_window', plateau }

    await sendGrowthReportEmail({ to: user.email, subject: report.subject, body: report.body })
    await supabaseAdmin.from('user_profiles')
      .update({ growth_report_sent_at: new Date().toISOString() }).eq('user_id', userId)
    return { userId, sent: true, trend: report.body.trend, experimentOpened: plateau.opened }
  }))

  await supabaseAdmin.from('cron_locks').update({ completed_at: new Date().toISOString() }).eq('lock_id', lockId)
  const sent = results.filter(r => r.status === 'fulfilled' && (r.value as { sent?: boolean }).sent).length
  const experiments = results.filter(r => r.status === 'fulfilled' && (r.value as { experimentOpened?: boolean }).experimentOpened).length
  return NextResponse.json({ sent, experimentsOpened: experiments, active: activeUserIds.length })
}

export { handler as GET, handler as POST }
