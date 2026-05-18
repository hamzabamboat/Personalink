import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

function adminAuth(request: NextRequest) {
  const cookie = request.cookies.get('admin_session')?.value
  const header = request.headers.get('x-admin-secret')
  return cookie === process.env.ADMIN_SECRET || header === process.env.ADMIN_SECRET
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  if (!adminAuth(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { userId } = await params

  // Safety check: block deletion of active/trialing subscribers
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('subscription_status, email')
    .eq('id', userId)
    .single()

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  if (user.subscription_status === 'active' || user.subscription_status === 'trialing') {
    return NextResponse.json({ error: 'Cannot delete an account with an active subscription' }, { status: 400 })
  }

  // Cascade deletes are handled by the DB foreign keys
  const { error } = await supabaseAdmin
    .from('users')
    .delete()
    .eq('id', userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, deleted_email: user.email })
}
