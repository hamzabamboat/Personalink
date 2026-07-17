import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getUserFromRequest } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { data } = await supabaseAdmin
    .from('oauth_tokens')
    .select('id, client_id, created_at, last_used_at, revoked_at')
    .eq('user_id', user.id)
    .is('revoked_at', null)
    .order('created_at', { ascending: false })

  const clientIds = [...new Set((data || []).map((t) => t.client_id))]
  const { data: clients } = await supabaseAdmin.from('oauth_clients').select('client_id, client_name').in('client_id', clientIds.length ? clientIds : ['none'])
  const nameById = new Map((clients || []).map((c) => [c.client_id, c.client_name]))

  return NextResponse.json({
    tokens: (data || []).map((t) => ({ id: t.id, client_name: nameById.get(t.client_id) ?? null, created_at: t.created_at, last_used_at: t.last_used_at })),
  })
}
