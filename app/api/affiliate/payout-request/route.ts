import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getPostHogClient } from '@/lib/posthog-server'

export const runtime = 'nodejs'

const MIN_PAYOUT_INR = 4000

/**
 * Request a payout. Sums all 'pending' + 'approved' commissions for the
 * affiliate, creates an affiliate_payouts row, and marks those commissions as
 * grouped under the payout. Admin processes manually from there.
 */
export async function POST(req: NextRequest) {
  const userId = req.cookies.get('session_user_id')?.value
  if (!userId) return NextResponse.json({ error: 'Sign in.' }, { status: 401 })

  // 1. Look up affiliate by user_id.
  const { data: affiliate } = await supabaseAdmin
    .from('affiliates')
    .select('id, status, payout_method')
    .eq('user_id', userId)
    .maybeSingle()
  if (!affiliate) return NextResponse.json({ error: 'No affiliate account.' }, { status: 404 })
  if (affiliate.status !== 'approved') return NextResponse.json({ error: 'Account is not approved.' }, { status: 403 })
  if (!affiliate.payout_method) return NextResponse.json({ error: 'Set a payout method first.' }, { status: 400 })

  // 2. Sum available (uncategorised, non-clawback) commissions.
  const { data: commissions } = await supabaseAdmin
    .from('affiliate_commissions')
    .select('id, commission_amount_inr, status')
    .eq('affiliate_id', affiliate.id)
    .is('payout_id', null)
    .in('status', ['pending', 'approved'])

  const list = (commissions ?? []) as Array<{ id: string; commission_amount_inr: number; status: string }>
  const total = list.reduce((sum, c) => sum + Number(c.commission_amount_inr), 0)

  if (total < MIN_PAYOUT_INR) {
    return NextResponse.json(
      { error: `Minimum payout is ₹${MIN_PAYOUT_INR.toLocaleString('en-IN')}. Available: ₹${Math.round(total).toLocaleString('en-IN')}.` },
      { status: 400 },
    )
  }

  // 3. Create payout row.
  const { data: payout, error: payoutErr } = await supabaseAdmin
    .from('affiliate_payouts')
    .insert({
      affiliate_id: affiliate.id,
      total_amount_inr: total,
      payout_method: affiliate.payout_method,
      status: 'requested',
    })
    .select('id')
    .single()

  if (payoutErr || !payout) {
    console.error('[affiliate/payout-request] insert payout failed', payoutErr)
    return NextResponse.json({ error: 'Could not create payout. Try again.' }, { status: 500 })
  }

  // 4. Group all included commissions under the new payout.
  const ids = list.map(c => c.id)
  if (ids.length > 0) {
    const { error: groupErr } = await supabaseAdmin
      .from('affiliate_commissions')
      .update({ payout_id: payout.id, status: 'approved' })
      .in('id', ids)
      .is('payout_id', null) // race-condition guard

    if (groupErr) {
      console.error('[affiliate/payout-request] commission grouping failed — rolling back', groupErr)
      // Best-effort rollback of the payout row so the user isn't blocked.
      await supabaseAdmin.from('affiliate_payouts').delete().eq('id', payout.id)
      return NextResponse.json({ error: 'Could not finalise payout. Try again.' }, { status: 500 })
    }
  }

  try {
    getPostHogClient().capture({
      distinctId: userId,
      event: 'affiliate_payout_requested',
      properties: { payout_id: payout.id, total_inr: total, commission_count: ids.length },
    })
  } catch { /* posthog optional */ }

  return NextResponse.json({ ok: true, payoutId: payout.id, totalInr: total })
}
