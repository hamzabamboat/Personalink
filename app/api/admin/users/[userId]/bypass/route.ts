import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

function adminAuth(request: NextRequest) {
  const cookie = request.cookies.get('admin_session')?.value
  const header = request.headers.get('x-admin-secret')
  return cookie === process.env.ADMIN_SECRET || header === process.env.ADMIN_SECRET
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  if (!adminAuth(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { userId } = await params
  const { bypass_limits } = await request.json()

  const { error } = await supabaseAdmin
    .from('user_profiles')
    .update({ bypass_limits: Boolean(bypass_limits) })
    .eq('user_id', userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, bypass_limits: Boolean(bypass_limits) })
}
