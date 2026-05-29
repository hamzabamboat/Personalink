// Vercel cron — daily. Nudges email-signup users ~24-48h old who haven't returned.
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendDay2NudgeEmail } from '@/lib/email'
import crypto from 'crypto'

async function handler(request: NextRequest) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = new Date().toISOString().slice(0, 10)
  const lockId = crypto.randomUUID()
  const { error: lockError } = await supabaseAdmin
    .from('cron_locks')
    .insert({ job_name: 'day2-nudge', run_date: today, lock_id: lockId })
  if (lockError) return NextResponse.json({ skipped: true, reason: 'already_ran_today' })

  const since48 = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
  const since24 = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const { data: users } = await supabaseAdmin
    .from('users')
    .select('id, email')
    .eq('signup_source', 'email_magic_link')
    .not('email', 'is', null)
    .gte('created_at', since48)
    .lte('created_at', since24)

  const results = await Promise.allSettled((users ?? []).map(async (u) => {
    if (!u.email) return { id: u.id, skipped: 'no_email' }
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('day2_nudge_sent_at').eq('user_id', u.id).maybeSingle()
    if (profile?.day2_nudge_sent_at) return { id: u.id, skipped: 'already_sent' }

    await sendDay2NudgeEmail({ to: u.email, userName: 'there' })
    await supabaseAdmin.from('user_profiles')
      .update({ day2_nudge_sent_at: new Date().toISOString() }).eq('user_id', u.id)
    return { id: u.id, sent: true }
  }))

  await supabaseAdmin.from('cron_locks').update({ completed_at: new Date().toISOString() }).eq('lock_id', lockId)
  const sent = results.filter(r => r.status === 'fulfilled' && (r.value as { sent?: boolean }).sent).length
  return NextResponse.json({ sent, total: users?.length ?? 0 })
}

export { handler as GET, handler as POST }
