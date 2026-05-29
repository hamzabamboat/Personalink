import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'

function isAdmin(req: NextRequest): boolean {
  return req.cookies.get('admin_session')?.value === process.env.ADMIN_SECRET
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: affiliates } = await supabaseAdmin
    .from('affiliates')
    .select('*')
    .order('applied_at', { ascending: false })

  const list = (affiliates ?? []) as Array<{ id: string }>
  if (list.length === 0) return NextResponse.json({ affiliates: [] })

  // Decorate with referral count + total commission for approved affiliates.
  const ids = list.map(a => a.id)
  const [{ data: refs }, { data: comms }] = await Promise.all([
    supabaseAdmin.from('affiliate_referrals').select('affiliate_id').in('affiliate_id', ids),
    supabaseAdmin
      .from('affiliate_commissions')
      .select('affiliate_id, commission_amount_inr, status')
      .in('affiliate_id', ids)
      .not('status', 'in', '("clawback","void")'),
  ])

  const refCounts: Record<string, number> = {}
  for (const r of (refs ?? []) as Array<{ affiliate_id: string }>) {
    refCounts[r.affiliate_id] = (refCounts[r.affiliate_id] ?? 0) + 1
  }
  const commTotals: Record<string, number> = {}
  for (const c of (comms ?? []) as Array<{ affiliate_id: string; commission_amount_inr: number }>) {
    commTotals[c.affiliate_id] = (commTotals[c.affiliate_id] ?? 0) + Number(c.commission_amount_inr)
  }

  const decorated = list.map(a => ({
    ...a,
    referral_count: refCounts[a.id] ?? 0,
    total_commission_inr: commTotals[a.id] ?? 0,
  }))

  return NextResponse.json({ affiliates: decorated })
}
