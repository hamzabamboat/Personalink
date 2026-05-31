// Vercel cron — daily. For each running experiment, gather treatment vs the
// user's pre-experiment baseline, evaluate lift under the v1 guardrails, update
// status, and roll back losers (clears future treatment application by ending
// the experiment). Idempotent per day via cron_locks (mirrors day7-stats).
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { evaluateExperiment } from '@/lib/experiments'
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
    .insert({ job_name: 'evaluate-experiments', run_date: today, lock_id: lockId })
  if (lockError) return NextResponse.json({ skipped: true, reason: 'already_ran_today' })

  const { data: running } = await supabaseAdmin
    .from('experiments')
    .select('id')
    .eq('status', 'running')

  const results = await Promise.allSettled(
    (running ?? []).map(async (e: { id: string }) => {
      const r = await evaluateExperiment(e.id)
      return { id: e.id, decision: r?.decision ?? 'skipped' }
    }),
  )

  await supabaseAdmin.from('cron_locks')
    .update({ completed_at: new Date().toISOString() }).eq('lock_id', lockId)

  const tally = { won: 0, lost: 0, inconclusive: 0, keep_running: 0 }
  for (const r of results) {
    if (r.status === 'fulfilled') {
      const d = (r.value as { decision: string }).decision
      if (d in tally) (tally as Record<string, number>)[d]++
    }
  }
  return NextResponse.json({ evaluated: running?.length ?? 0, ...tally })
}

export { handler as GET, handler as POST }
