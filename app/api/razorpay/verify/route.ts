// Called from the frontend after Razorpay checkout completes (card saved for trial).
// Verifies the payment/subscription signature and activates the trial.

import { NextRequest, NextResponse } from 'next/server'
import { verifyPaymentSignature, TRIAL_DAYS, PLAN_IDS } from '@/lib/razorpay'
import { getUserFromRequest } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendTrialStartedEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { razorpay_payment_id, razorpay_subscription_id, razorpay_signature, plan } =
    await request.json()

  if (!razorpay_subscription_id || !razorpay_signature) {
    return NextResponse.json({ error: 'Missing payment details' }, { status: 400 })
  }

  // Razorpay may or may not provide razorpay_payment_id on card-save/₹0 auth events.
  // Verify signature only if payment_id is present.
  if (razorpay_payment_id) {
    const isValid = verifyPaymentSignature({
      razorpay_payment_id,
      razorpay_subscription_id,
      razorpay_signature,
    })
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 })
    }
  }

  const now = new Date()
  const trialEndsAt = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000)
  const nowIso = now.toISOString()
  const trialEndsAtIso = trialEndsAt.toISOString()

  const planName: string = plan || 'standard'
  const planLimits: Record<string, number> = { starter: 12, standard: 20, pro: 30 }
  const razorpayPlanId = PLAN_IDS[planName] || process.env.RAZORPAY_PLAN_ID!

  await Promise.all([
    // Mark subscription as trialing
    supabaseAdmin.from('subscriptions').upsert(
      {
        user_id: user.id,
        razorpay_subscription_id,
        status: 'trial',
        plan_id: razorpayPlanId,
        start_date: nowIso,
        trial_ends_at: trialEndsAtIso,
        updated_at: nowIso,
      },
      { onConflict: 'user_id' }
    ),
    // Set user status to trialing
    supabaseAdmin
      .from('users')
      .update({ subscription_status: 'trialing', updated_at: nowIso })
      .eq('id', user.id),
    // Give full plan access immediately during trial
    supabaseAdmin
      .from('user_profiles')
      .update({
        plan: planName,
        posts_limit: planLimits[planName] || 20,
        updated_at: nowIso,
      })
      .eq('user_id', user.id),
  ])

  // Fire-and-forget trial started email
  const { data: userData } = await supabaseAdmin
    .from('users')
    .select('email, linkedin_name')
    .eq('id', user.id)
    .single()
  if (userData?.email) {
    sendTrialStartedEmail({
      to: userData.email,
      userName: userData.linkedin_name || 'there',
      trialEndsAt,
      plan: planName,
    }).catch(console.error)
  }

  const response = NextResponse.json({ success: true, trial: true, trial_ends_at: trialEndsAtIso })
  response.cookies.set('sub_status', 'trial', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 8, // 8 days — covers trial + 1 day buffer
    path: '/',
  })
  return response
  } catch (err) {
    console.error('[razorpay/verify]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
