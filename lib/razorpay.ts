import Razorpay from 'razorpay'
import crypto from 'crypto'
import { TIER_PRICING, RAZORPAY_PLAN_IDS } from './pricing-config'

export function getRazorpay() {
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
  })
}

// Public maps widened to Record<string, …> so DB-string callers can index without narrowing.
export const PLAN_IDS: Record<string, string> = {
  starter: RAZORPAY_PLAN_IDS.starter.monthly,
  standard: RAZORPAY_PLAN_IDS.standard.monthly,
  pro: RAZORPAY_PLAN_IDS.pro.monthly,
}

export const ANNUAL_PLAN_IDS: Record<string, string> = {
  starter: RAZORPAY_PLAN_IDS.starter.annual,
  standard: RAZORPAY_PLAN_IDS.standard.annual,
  pro: RAZORPAY_PLAN_IDS.pro.annual,
}

// Legacy single plan ID
export const PLAN_ID = process.env.RAZORPAY_PLAN_ID!

// Razorpay amounts are in paise (₹ × 100).
export const PLAN_AMOUNTS: Record<string, number> = {
  starter: TIER_PRICING.starter.INR.monthly * 100,
  standard: TIER_PRICING.standard.INR.monthly * 100,
  pro: TIER_PRICING.pro.INR.monthly * 100,
}

export const ANNUAL_PLAN_AMOUNTS: Record<string, number> = {
  starter: TIER_PRICING.starter.INR.annual * 100,
  standard: TIER_PRICING.standard.INR.annual * 100,
  pro: TIER_PRICING.pro.INR.annual * 100,
}

export const PLAN_CURRENCY = 'INR'

export const TRIAL_DAYS = 7

export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!)
    .update(rawBody)
    .digest('hex')
  return expected === signature
}

export function verifyPaymentSignature({
  razorpay_payment_id,
  razorpay_subscription_id,
  razorpay_signature,
}: {
  razorpay_payment_id: string
  razorpay_subscription_id: string
  razorpay_signature: string
}): boolean {
  const payload = `${razorpay_payment_id}|${razorpay_subscription_id}`
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
    .update(payload)
    .digest('hex')
  return expected === razorpay_signature
}
