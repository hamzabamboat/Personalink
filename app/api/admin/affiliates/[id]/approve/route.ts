import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendAffiliateApprovedEmail } from '@/lib/email'
import { getPostHogClient } from '@/lib/posthog-server'

export const runtime = 'nodejs'

function isAdmin(req: NextRequest): boolean {
  return req.cookies.get('admin_session')?.value === process.env.ADMIN_SECRET
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params

  const { data: existing } = await supabaseAdmin
    .from('affiliates')
    .select('id, status, user_id, ref_code, email, full_name')
    .eq('id', id)
    .maybeSingle()
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (existing.status === 'approved') return NextResponse.json({ ok: true, alreadyApproved: true })

  const { error } = await supabaseAdmin
    .from('affiliates')
    .update({
      status: 'approved',
      approved_at: new Date().toISOString(),
      approved_by: 'admin',
      rejected_reason: null,
    })
    .eq('id', id)

  if (error) {
    console.error('[admin/affiliates/approve] update failed', error)
    return NextResponse.json({ error: 'Could not approve.' }, { status: 500 })
  }

  // Notification email — best-effort.
  const email = existing.email as string | null
  const fullName = (existing.full_name as string | null) ?? ''
  if (email) {
    sendAffiliateApprovedEmail({
      to: email,
      firstName: fullName.split(' ')[0] || fullName || 'there',
      refCode: existing.ref_code as string,
    }).catch(e => console.error('[admin/affiliates/approve] approval email failed', e))
  }

  try {
    getPostHogClient().capture({
      distinctId: existing.user_id as string,
      event: 'affiliate_approved',
      properties: { ref_code: existing.ref_code },
    })
  } catch { /* posthog optional */ }

  return NextResponse.json({ ok: true })
}
