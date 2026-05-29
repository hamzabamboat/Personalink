import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendAffiliateRejectedEmail } from '@/lib/email'
import { getPostHogClient } from '@/lib/posthog-server'

export const runtime = 'nodejs'

function isAdmin(req: NextRequest): boolean {
  return req.cookies.get('admin_session')?.value === process.env.ADMIN_SECRET
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params

  let reason = ''
  try {
    const body = (await req.json()) as { reason?: string }
    reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 500) : ''
  } catch {
    reason = ''
  }

  const { data: existing } = await supabaseAdmin
    .from('affiliates')
    .select('id, status, user_id, email, full_name')
    .eq('id', id)
    .maybeSingle()
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { error } = await supabaseAdmin
    .from('affiliates')
    .update({
      status: 'rejected',
      rejected_reason: reason || null,
      approved_by: 'admin',
    })
    .eq('id', id)

  if (error) {
    console.error('[admin/affiliates/reject] update failed', error)
    return NextResponse.json({ error: 'Could not reject.' }, { status: 500 })
  }

  // Notification email — best-effort.
  const email = existing.email as string | null
  const fullName = (existing.full_name as string | null) ?? ''
  if (email) {
    sendAffiliateRejectedEmail({
      to: email,
      firstName: fullName.split(' ')[0] || fullName || 'there',
      reason: reason || null,
    }).catch(e => console.error('[admin/affiliates/reject] rejection email failed', e))
  }

  try {
    getPostHogClient().capture({
      distinctId: existing.user_id as string,
      event: 'affiliate_rejected',
      properties: { reason },
    })
  } catch { /* posthog optional */ }

  return NextResponse.json({ ok: true })
}
