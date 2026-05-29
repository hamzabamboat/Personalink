import { NextRequest, NextResponse } from 'next/server'
import { verifyWebhookSignature } from '@/lib/razorpay'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getPostHogClient } from '@/lib/posthog-server'
import { getTierLimits, type TierID } from '@/lib/pricing-config'
import { creditAffiliateCommission } from '@/lib/affiliate-credit'

// Razorpay sends webhooks as JSON with x-razorpay-signature header
export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const signature = request.headers.get('x-razorpay-signature') ?? ''

  if (!verifyWebhookSignature(rawBody, signature)) {
    console.error('Razorpay webhook: invalid signature')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  let event: { event: string; payload: Record<string, { entity: Record<string, unknown> }> }
  try {
    event = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const subEntity = event.payload?.subscription?.entity as {
    id?: string
    status?: string
    current_start?: number
    current_end?: number
    notes?: { user_id?: string }
  } | undefined

  if (!subEntity?.id) {
    // Non-subscription event — acknowledge and ignore
    return NextResponse.json({ received: true })
  }

  const razorpaySubId = subEntity.id
  const userId = subEntity.notes?.user_id

  const nextBillingDate = subEntity.current_end
    ? new Date(subEntity.current_end * 1000).toISOString()
    : null
  const startDate = subEntity.current_start
    ? new Date(subEntity.current_start * 1000).toISOString()
    : null

  // Map Razorpay status to our internal status
  const statusMap: Record<string, string> = {
    'subscription.activated': 'active',
    'subscription.charged': 'active',
    'subscription.pending': 'pending',
    'subscription.halted': 'halted',
    'subscription.cancelled': 'cancelled',
    'subscription.completed': 'completed',
    'subscription.expired': 'expired',
  }
  const newStatus = statusMap[event.event]
  if (!newStatus) return NextResponse.json({ received: true })

  const now = new Date().toISOString()

  // Update subscriptions table by razorpay_subscription_id
  const updatePayload: Record<string, string | null> = {
    status: newStatus,
    updated_at: now,
  }
  if (startDate) updatePayload.start_date = startDate
  if (nextBillingDate) updatePayload.next_billing_date = nextBillingDate
  // First charge after trial — clear trial_ends_at
  if (newStatus === 'active') updatePayload.trial_ends_at = null

  const { data: sub } = await supabaseAdmin
    .from('subscriptions')
    .update(updatePayload)
    .eq('razorpay_subscription_id', razorpaySubId)
    .select('user_id')
    .single()

  // Also update denormalized status on users table
  const resolvedUserId = sub?.user_id ?? userId
  if (resolvedUserId) {
    const userSubStatus = ['active', 'charged'].includes(newStatus) ? 'active' : newStatus
    await supabaseAdmin
      .from('users')
      .update({ subscription_status: userSubStatus, updated_at: now })
      .eq('id', resolvedUserId)

    const planFromNotes = (subEntity.notes as Record<string, string> | undefined)?.plan || 'standard'
    const postsLimit = getTierLimits(planFromNotes as TierID).postsPerMonth
      ?? getTierLimits('standard').postsPerMonth
      ?? 22

    // Update user_profiles with plan and post limit derived from Razorpay notes
    if (newStatus === 'active') {
      await supabaseAdmin
        .from('user_profiles')
        .update({
          plan: planFromNotes,
          posts_limit: postsLimit,
          updated_at: now,
        })
        .eq('user_id', resolvedUserId)
    }

    // Increment resubscription count on first activation
    if (newStatus === 'active') {
      const { data: currentUser } = await supabaseAdmin
        .from('users')
        .select('subscription_count')
        .eq('id', resolvedUserId)
        .single()
      await supabaseAdmin
        .from('users')
        .update({ subscription_count: (currentUser?.subscription_count ?? 0) + 1 })
        .eq('id', resolvedUserId)
    }

    // Trial payment failed — downgrade to read-only (0 posts limit)
    if (newStatus === 'halted') {
      await supabaseAdmin
        .from('user_profiles')
        .update({ plan: planFromNotes, posts_limit: 0, updated_at: now })
        .eq('user_id', resolvedUserId)
    }
  }

  if (resolvedUserId && (newStatus === 'active' || newStatus === 'cancelled')) {
    const planFromNotes = (subEntity.notes as Record<string, string> | undefined)?.plan || 'standard'
    getPostHogClient().capture({
      distinctId: resolvedUserId,
      event: newStatus === 'active' ? 'subscription_activated' : 'subscription_cancelled',
      properties: { processor: 'razorpay', subscription_id: razorpaySubId, plan: planFromNotes, razorpay_event: event.event },
    })
  }

  // ── Affiliate commission credit (best-effort, idempotent). ────────────────
  // `subscription.charged` fires for every successful recurring charge and
  // carries the payment entity. We credit per-payment so re-deliveries are
  // safely deduplicated by the (payment_provider, payment_ref) constraint.
  if (resolvedUserId && event.event === 'subscription.charged') {
    const payment = (event.payload?.payment?.entity ?? {}) as {
      id?: string
      amount?: number      // paise
      currency?: string
    }
    if (payment.id && typeof payment.amount === 'number' && payment.amount > 0) {
      // Razorpay reports paise — convert to INR (and we only deal in INR with
      // Razorpay anyway, so currency is always 'INR').
      const amountInr = payment.amount / 100
      const result = await creditAffiliateCommission({
        paymentProvider: 'razorpay',
        paymentRef: payment.id,
        paymentAmount: amountInr,
        paymentCurrency: 'INR',
        userId: resolvedUserId,
      })
      if (result.credited) {
        getPostHogClient().capture({
          distinctId: resolvedUserId,
          event: 'affiliate_commission_credited',
          properties: { processor: 'razorpay', commission_inr: result.commissionAmountInr, payment_ref: payment.id },
        })
      }
    }
  }

  console.log(`Razorpay webhook: ${event.event} → sub ${razorpaySubId} → ${newStatus}`)
  return NextResponse.json({ received: true })
}
