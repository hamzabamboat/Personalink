import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getPostHogClient } from '@/lib/posthog-server'
import { getTierLimits, type TierID, type Currency } from '@/lib/pricing-config'
import { creditAffiliateCommission } from '@/lib/affiliate-credit'
import crypto from 'crypto'

const KNOWN_CURRENCIES: Currency[] = ['INR', 'USD', 'EUR', 'GBP']
function asCurrency(s: string): Currency {
  return (KNOWN_CURRENCIES as readonly string[]).includes(s) ? (s as Currency) : 'USD'
}

const FALLBACK_LIMIT = getTierLimits('standard').postsPerMonth ?? 22
function postsLimitFor(plan: string): number {
  return getTierLimits(plan as TierID).postsPerMonth ?? FALLBACK_LIMIT
}

function verifyDodoWebhook(rawBody: string, headers: Headers): boolean {
  const webhookId = headers.get('webhook-id') ?? ''
  const webhookTimestamp = headers.get('webhook-timestamp') ?? ''
  const webhookSignature = headers.get('webhook-signature') ?? ''

  if (!webhookId || !webhookTimestamp || !webhookSignature) return false

  const signedContent = `${webhookId}.${webhookTimestamp}.${rawBody}`
  const secret = process.env.DODO_WEBHOOK_SECRET ?? ''
  const secretBytes = Buffer.from(secret.replace('whsec_', ''), 'base64')
  const computed = crypto.createHmac('sha256', secretBytes).update(signedContent).digest('base64')

  return webhookSignature
    .split(' ')
    .map(s => s.replace('v1,', ''))
    .some(sig => sig === computed)
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text()

  if (!verifyDodoWebhook(rawBody, request.headers)) {
    console.error('Dodo webhook: invalid signature')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  let event: { type: string; data: Record<string, unknown> }
  try {
    event = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const data = event.data as Record<string, unknown>
  const subscriptionId = ((data.subscription_id ?? data.id) as string | undefined)
  const metadata = (data.metadata ?? {}) as Record<string, string>
  const userId = metadata.user_id
  const accountId = metadata.account_id
  const plan = metadata.plan || 'standard'
  const currency = metadata.currency || 'USD'
  const amount = (data.amount as number | undefined) ?? 0
  const now = new Date().toISOString()

  // ── Billing period fields (Dodo-specific) ──────────────────────────────
  // Dodo sends next_billing_date (ISO string) and payment_frequency_interval
  // ('Month' | 'Year') in every subscription event.
  // We map these to our internal billing_period ('monthly' | 'annual') and
  // store next_billing_date so the scheduler can enforce period caps.
  const rawNextBilling = data.next_billing_date as string | undefined
  const rawInterval    = data.payment_frequency_interval as string | undefined
  const billingPeriod: 'monthly' | 'annual' =
    rawInterval?.toLowerCase().startsWith('year') ? 'annual' : 'monthly'

  // Fallback: if Dodo didn't send next_billing_date, derive it from now
  function derivedNextBilling(): string {
    const d = new Date()
    billingPeriod === 'annual' ? d.setFullYear(d.getFullYear() + 1) : d.setMonth(d.getMonth() + 1)
    return d.toISOString()
  }
  const nextBillingDate: string = rawNextBilling ?? derivedNextBilling()

  async function activateAccount() {
    // 1. Activate the specific linkedin_account
    if (accountId) {
      await supabaseAdmin
        .from('linkedin_accounts')
        .update({
          subscription_status: 'active',
          plan,
          posts_limit: postsLimitFor(plan),
          updated_at: now,
        })
        .eq('id', accountId)
    } else if (subscriptionId) {
      // Fallback: find account by dodo_subscription_id
      await supabaseAdmin
        .from('linkedin_accounts')
        .update({
          subscription_status: 'active',
          plan,
          posts_limit: postsLimitFor(plan),
          updated_at: now,
        })
        .eq('dodo_subscription_id', subscriptionId)
    }

    // 2. Update legacy subscriptions table
    if (subscriptionId) {
      await supabaseAdmin
        .from('subscriptions')
        .update({
          status: 'active',
          payment_processor: 'dodo',
          currency,
          amount,
          billing_period: billingPeriod,
          next_billing_date: nextBillingDate,
          updated_at: now,
        })
        .eq('dodo_subscription_id', subscriptionId)
    }

    // 3. Denormalize: mark user as active if they have any active account
    if (userId) {
      await supabaseAdmin
        .from('users')
        .update({ subscription_status: 'active', updated_at: now })
        .eq('id', userId)

      // Also update user_profiles plan for the personal account (used for post limits)
      const { data: personalAccount } = await supabaseAdmin
        .from('linkedin_accounts')
        .select('account_type, plan, posts_limit')
        .eq('id', accountId ?? '')
        .maybeSingle()

      if (personalAccount?.account_type === 'personal') {
        await supabaseAdmin
          .from('user_profiles')
          .update({ plan, posts_limit: postsLimitFor(plan), updated_at: now })
          .eq('user_id', userId)
      }
    }
  }

  async function deactivateAccount() {
    if (subscriptionId) {
      await supabaseAdmin
        .from('subscriptions')
        .update({ status: 'cancelled', updated_at: now })
        .eq('dodo_subscription_id', subscriptionId)

      await supabaseAdmin
        .from('linkedin_accounts')
        .update({ subscription_status: 'canceled', updated_at: now })
        .eq('dodo_subscription_id', subscriptionId)
    }

    // Denormalize: if user has no more active accounts, mark user inactive
    if (userId) {
      const { count } = await supabaseAdmin
        .from('linkedin_accounts')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('subscription_status', 'active')

      if ((count ?? 0) === 0) {
        await supabaseAdmin
          .from('users')
          .update({ subscription_status: 'canceled', updated_at: now })
          .eq('id', userId)
      }
    }
  }

  switch (event.type) {
    case 'payment.succeeded':
    case 'subscription.active':
      await activateAccount()
      if (userId) getPostHogClient().capture({ distinctId: userId, event: 'dodo_subscription_activated', properties: { processor: 'dodo', plan, subscription_id: subscriptionId, amount, currency } })

      // ── Affiliate commission credit (best-effort, idempotent). ───────────
      // Only credit on actual payment events — subscription.active without a
      // payment_id is the trial-start ping and shouldn't pay an affiliate yet.
      if (event.type === 'payment.succeeded' && userId && amount > 0) {
        const paymentRef = (data.payment_id as string | undefined)
          ?? (subscriptionId ? `${subscriptionId}#${data.next_billing_date ?? Date.now()}` : null)
        if (paymentRef) {
          const result = await creditAffiliateCommission({
            paymentProvider: 'dodo',
            paymentRef,
            paymentAmount: amount,
            paymentCurrency: asCurrency(currency),
            userId,
          })
          if (result.credited) {
            getPostHogClient().capture({
              distinctId: userId,
              event: 'affiliate_commission_credited',
              properties: { processor: 'dodo', commission_inr: result.commissionAmountInr, payment_ref: paymentRef },
            })
          }
        }
      }
      break

    case 'subscription.cancelled':
      await deactivateAccount()
      if (userId) getPostHogClient().capture({ distinctId: userId, event: 'dodo_subscription_cancelled', properties: { processor: 'dodo', plan, subscription_id: subscriptionId } })
      break

    case 'subscription.failed':
      if (subscriptionId) {
        await supabaseAdmin
          .from('subscriptions')
          .update({ status: 'past_due', updated_at: now })
          .eq('dodo_subscription_id', subscriptionId)

        await supabaseAdmin
          .from('linkedin_accounts')
          .update({ subscription_status: 'past_due', updated_at: now })
          .eq('dodo_subscription_id', subscriptionId)
      }
      break
  }

  console.log(`Dodo webhook: ${event.type} → sub ${subscriptionId} account ${accountId}`)
  return NextResponse.json({ received: true })
}
