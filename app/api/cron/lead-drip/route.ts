// Vercel cron — daily. Sends a rotating nurture email every 10 days to leads
// who gave an email (via the voice-analyzer magic-link box) but have not
// converted (no matching row in `users`) and have not unsubscribed.
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendLeadDripEmail } from '@/lib/email'
import { getLeadDripTemplate } from '@/lib/lead-drip-templates'
import crypto from 'crypto'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL!

async function handler(request: NextRequest) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = new Date().toISOString().slice(0, 10)
  const lockId = crypto.randomUUID()
  const { error: lockError } = await supabaseAdmin
    .from('cron_locks')
    .insert({ job_name: 'lead-drip', run_date: today, lock_id: lockId })
  if (lockError) return NextResponse.json({ skipped: true, reason: 'already_ran_today' })

  const cutoff = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
  const { data: dueLeads } = await supabaseAdmin
    .from('leads')
    .select('email, template_index, unsubscribe_token')
    .is('unsubscribed_at', null)
    .or(`last_sent_at.is.null,last_sent_at.lte.${cutoff}`)

  const leads = dueLeads ?? []
  let leadsToEmail = leads
  if (leads.length > 0) {
    const emails = leads.map(l => l.email as string)
    const { data: convertedUsers } = await supabaseAdmin
      .from('users')
      .select('email')
      .in('email', emails)
    const convertedSet = new Set((convertedUsers ?? []).map(u => u.email as string))
    leadsToEmail = leads.filter(l => !convertedSet.has(l.email as string))
  }

  const results = await Promise.allSettled(leadsToEmail.map(async (lead) => {
    const template = getLeadDripTemplate(lead.template_index as number)
    const unsubscribeUrl = `${APP_URL}/api/leads/unsubscribe?token=${lead.unsubscribe_token}`
    await sendLeadDripEmail({ to: lead.email as string, template, unsubscribeUrl })
    await supabaseAdmin.from('leads')
      .update({ template_index: (lead.template_index as number) + 1, last_sent_at: new Date().toISOString() })
      .eq('email', lead.email as string)
    return { email: lead.email, sent: true }
  }))

  await supabaseAdmin.from('cron_locks').update({ completed_at: new Date().toISOString() }).eq('lock_id', lockId)
  const sent = results.filter(r => r.status === 'fulfilled' && (r.value as { sent?: boolean }).sent).length
  return NextResponse.json({ sent, total: leadsToEmail.length })
}

export { handler as GET, handler as POST }
