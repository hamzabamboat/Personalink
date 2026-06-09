/**
 * Server-side commission credit pipeline. Called by Razorpay and Dodo webhooks
 * on every successful paid charge for a user. Pure helpers (no DB writes) live
 * in `lib/affiliate.ts`; this file owns the side-effects.
 *
 * Guarantees:
 *   - Idempotent: relies on the (payment_provider, payment_ref) unique
 *     constraint on affiliate_commissions. Re-delivered webhooks no-op.
 *   - Best-effort: any failure here is logged but never thrown — payment
 *     processing must succeed even if the affiliate credit step blows up.
 *   - Commission window enforced: payments outside the referral's
 *     `commission_expires_at` are silently skipped.
 */

import { supabaseAdmin } from './supabase-admin'
import {
  AFFILIATE_COMMISSION_RATE,
  AFFILIATE_COMMISSION_DURATION_MONTHS,
  commissionAmountInr,
  commissionExpiryFrom,
  paymentToInr,
  withinCommissionWindow,
} from './affiliate'
import { getUsdInrRate, FX_FALLBACK_USD_INR } from './fx'
import type { Currency } from './pricing-config'

export type CreditArgs = {
  paymentProvider: 'dodo' | 'razorpay'
  /** Unique per-charge identifier. For Razorpay use `payment.id`; for Dodo use
   *  `payment_id` or `${subscription_id}#${billing_date}` as fallback. */
  paymentRef: string
  paymentAmount: number
  paymentCurrency: Currency
  /** Referred user (subscriber). */
  userId: string
  /** Timestamp of the actual charge — defaults to now. */
  occurredAt?: string
}

export type CreditResult =
  | { credited: false; reason: 'no_referral' | 'expired' | 'duplicate' | 'error' }
  | { credited: true; commissionId: string; commissionAmountInr: number }

export async function creditAffiliateCommission(args: CreditArgs): Promise<CreditResult> {
  const occurredAt = args.occurredAt ?? new Date().toISOString()

  try {
    // 1. Look up referral row for this user.
    const { data: referral } = await supabaseAdmin
      .from('affiliate_referrals')
      .select('id, affiliate_id, first_paid_at, commission_expires_at, status')
      .eq('user_id', args.userId)
      .maybeSingle()

    if (!referral) return { credited: false, reason: 'no_referral' }

    // 2. Verify affiliate is still in good standing (approved).
    const { data: affiliate } = await supabaseAdmin
      .from('affiliates')
      .select('id, status, commission_rate, commission_duration_months')
      .eq('id', referral.affiliate_id)
      .maybeSingle()

    if (!affiliate || affiliate.status !== 'approved') {
      return { credited: false, reason: 'no_referral' }
    }

    const rate = (affiliate.commission_rate as number | null) ?? AFFILIATE_COMMISSION_RATE
    const durationMonths = (affiliate.commission_duration_months as number | null) ?? AFFILIATE_COMMISSION_DURATION_MONTHS

    // 3. If this is the first paid charge, set first_paid_at and the 12-month
    //    commission window. Else verify we're still inside the window.
    let commissionExpiresAt = referral.commission_expires_at as string | null
    if (!referral.first_paid_at) {
      commissionExpiresAt = commissionExpiryFrom(occurredAt, durationMonths)
      await supabaseAdmin
        .from('affiliate_referrals')
        .update({
          first_paid_at: occurredAt,
          commission_expires_at: commissionExpiresAt,
          status: 'paying',
        })
        .eq('id', referral.id)
    } else {
      if (!withinCommissionWindow(commissionExpiresAt, occurredAt)) {
        await supabaseAdmin
          .from('affiliate_referrals')
          .update({ status: 'expired' })
          .eq('id', referral.id)
          .neq('status', 'expired')
        return { credited: false, reason: 'expired' }
      }
      // Promote 'signed_up' / 'trialing' → 'paying' on subsequent charges too,
      // just in case the first_paid_at was set without the status flip.
      if (referral.status !== 'paying') {
        await supabaseAdmin
          .from('affiliate_referrals')
          .update({ status: 'paying' })
          .eq('id', referral.id)
      }
    }

    // 4. Compute INR-equivalent payment + commission. USD converts at the live
    //    weekly rate (getUsdInrRate); GBP/EUR/INR stay on the static map.
    const usdInr = args.paymentCurrency === 'USD' ? await getUsdInrRate() : FX_FALLBACK_USD_INR
    const paymentInr = paymentToInr(args.paymentCurrency, args.paymentAmount, usdInr)
    const commissionInr = commissionAmountInr(paymentInr, rate)

    // 5. Insert commission row. Unique constraint on
    //    (payment_provider, payment_ref) handles duplicate webhook delivery.
    const { data: row, error: insertErr } = await supabaseAdmin
      .from('affiliate_commissions')
      .insert({
        affiliate_id: affiliate.id,
        referral_id: referral.id,
        payment_provider: args.paymentProvider,
        payment_ref: args.paymentRef,
        payment_amount: args.paymentAmount,
        payment_currency: args.paymentCurrency,
        payment_inr_equivalent: paymentInr,
        commission_amount_inr: commissionInr,
        status: 'pending',
      })
      .select('id')
      .single()

    if (insertErr) {
      // 23505 = unique_violation — webhook re-delivery, treat as no-op.
      if ((insertErr as { code?: string }).code === '23505') {
        return { credited: false, reason: 'duplicate' }
      }
      console.error('[affiliate-credit] insert failed', insertErr)
      return { credited: false, reason: 'error' }
    }

    return {
      credited: true,
      commissionId: row!.id as string,
      commissionAmountInr: commissionInr,
    }
  } catch (err) {
    console.error('[affiliate-credit] unexpected error', err)
    return { credited: false, reason: 'error' }
  }
}
