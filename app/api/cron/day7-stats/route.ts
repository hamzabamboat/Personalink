// Vercel cron — daily. Sends a 1-week stats email to email-signup users ~7-8 days old.
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendDay7StatsEmail } from '@/lib/email'
import { checkLimit } from '@/lib/usage-limits'
import crypto from 'crypto'

async function handler(request: NextRequest) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = new Date().toISOString().slice(0, 10)
  const lockId = crypto.randomUUID()
  const { error: lockError } = await supabaseAdmin
    .from('cron_locks')
    .insert({ job_name: 'day7-stats', run_date: today, lock_id: lockId })
  if (lockError) return NextResponse.json({ skipped: true, reason: 'already_ran_today' })

  const since8 = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString()
  const since7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data: users } = await supabaseAdmin
    .from('users')
    .select('id, email')
    .eq('signup_source', 'email_magic_link')
    .not('email', 'is', null)
    .gte('created_at', since8)
    .lte('created_at', since7)

  const results = await Promise.allSettled((users ?? []).map(async (u) => {
    if (!u.email) return { id: u.id, skipped: 'no_email' }
    const { data: profile } = await supabaseAdmin
      .from('user_profiles').select('day7_stats_sent_at, plan').eq('user_id', u.id).maybeSingle()
    if (profile?.day7_stats_sent_at) return { id: u.id, skipped: 'already_sent' }

    const { used } = await checkLimit(u.id, (profile?.plan || 'free'), 'posts_generated')
    await sendDay7StatsEmail({ to: u.email, userName: 'there', postsGenerated: used })
    await supabaseAdmin.from('user_profiles')
      .update({ day7_stats_sent_at: new Date().toISOString() }).eq('user_id', u.id)
    return { id: u.id, sent: true }
  }))

  await supabaseAdmin.from('cron_locks').update({ completed_at: new Date().toISOString() }).eq('lock_id', lockId)
  const sent = results.filter(r => r.status === 'fulfilled' && (r.value as { sent?: boolean }).sent).length
  return NextResponse.json({ sent, total: users?.length ?? 0 })
}

export { handler as GET, handler as POST }
