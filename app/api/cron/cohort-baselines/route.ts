// Vercel cron — daily. Rolls up cohort-median sub-scores into cohort_baselines,
// feeding cold-start partial pooling in lib/growth-score.ts. Idempotent per day
// via cron_locks (mirrors day7-stats).
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { persistCohortBaselines } from '@/lib/cohort-baselines'
import crypto from 'crypto'

async function handler(request: NextRequest) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = new Date().toISOString().slice(0, 10)
  const lockId = crypto.randomUUID()
  const { error: lockError } = await supabaseAdmin
    .from('cron_locks')
    .insert({ job_name: 'cohort-baselines', run_date: today, lock_id: lockId })
  if (lockError) return NextResponse.json({ skipped: true, reason: 'already_ran_today' })

  const baseline = await persistCohortBaselines()

  await supabaseAdmin.from('cron_locks').update({ completed_at: new Date().toISOString() }).eq('lock_id', lockId)
  return NextResponse.json({ ok: true, n_users: baseline.n_users })
}

export { handler as GET, handler as POST }
