import { NextRequest, NextResponse } from 'next/server'
import { getRazorpay, PLAN_IDS, PLAN_AMOUNTS, TRIAL_DAYS } from '@/lib/razorpay'
import { getUserFromRequest } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-admin'


export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json().catch(() => ({}))
    const planId: string = body.planId || 'standard'

    const razorpayPlanId = PLAN_IDS[planId]
    if (!razorpayPlanId) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })

    // Block if already on an active or trialing subscription
    const { data: existingSub } = await supabaseAdmin
      .from('subscriptions')
      .select('razorpay_subscription_id, status')
      .eq('user_id', user.id)
      .maybeSingle()

    if (existingSub?.status === 'active' || existingSub?.status === 'trial') {
      return NextResponse.json({ error: 'Already subscribed' }, { status: 409 })
    }

    // Create subscription with 7-day free trial
    // trial_period is valid Razorpay API field but missing from their TS typings
    const rzp = getRazorpay()
    type RazorpaySubscriptionWithTrial = Parameters<typeof rzp.subscriptions.create>[0] & { trial_period?: number }
    const subscriptionBody: RazorpaySubscriptionWithTrial = {
      plan_id: razorpayPlanId,
      customer_notify: 1,
      quantity: 1,
      total_count: 120,
      trial_period: TRIAL_DAYS,
      notes: { user_id: user.id, plan: planId },
    }
    const subscription = await rzp.subscriptions.create(subscriptionBody as Parameters<typeof rzp.subscriptions.create>[0])

    await supabaseAdmin.from('subscriptions').upsert(
      {
        user_id: user.id,
        razorpay_subscription_id: subscription.id,
        status: 'created',
        plan_id: razorpayPlanId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )

    return NextResponse.json({
      subscription_id: subscription.id,
      plan: planId,
      amount: PLAN_AMOUNTS[planId],
      trial_days: TRIAL_DAYS,
    })
  } catch (err) {
    console.error('[razorpay/create-subscription]', err)
    const message = err instanceof Error ? err.message : 'Failed to create subscription'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

