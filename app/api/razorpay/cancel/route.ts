import { NextRequest, NextResponse } from 'next/server'
import { getRazorpay } from '@/lib/razorpay'
import { getUserFromRequest } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: sub } = await supabaseAdmin
    .from('subscriptions')
    .select('razorpay_subscription_id, status')
    .eq('user_id', user.id)
    .single()

  if (!sub || (sub.status !== 'active' && sub.status !== 'trial' && sub.status !== 'trialing')) {
    return NextResponse.json({ error: 'No active subscription found' }, { status: 404 })
  }

  // cancel_at_cycle_end: 1 = cancel at end of current billing period (user keeps access until then)
  await getRazorpay().subscriptions.cancel(sub.razorpay_subscription_id as string, 1)

  const now = new Date().toISOString()
  await Promise.all([
    supabaseAdmin
      .from('subscriptions')
      .update({ status: 'cancelled', updated_at: now })
      .eq('user_id', user.id),
    supabaseAdmin
      .from('users')
      .update({ subscription_status: 'canceled', updated_at: now })
      .eq('id', user.id),
  ])

  const response = NextResponse.json({ success: true })
  response.cookies.set('sub_status', 'inactive', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  })
  return response
}
