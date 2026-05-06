import Razorpay from 'razorpay'
import crypto from 'crypto'

export function getRazorpay() {
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
  })
}

// Map plan names to Razorpay plan IDs (set these env vars after creating plans in Razorpay)
export const PLAN_IDS: Record<string, string> = {
  starter: process.env.RAZORPAY_PLAN_ID_STARTER || process.env.RAZORPAY_PLAN_ID!,
  standard: process.env.RAZORPAY_PLAN_ID_STANDARD || process.env.RAZORPAY_PLAN_ID!,
  pro: process.env.RAZORPAY_PLAN_ID_PRO || process.env.RAZORPAY_PLAN_ID!,
}

// Legacy single plan ID
export const PLAN_ID = process.env.RAZORPAY_PLAN_ID!

export const PLAN_AMOUNTS: Record<string, number> = {
  starter: 99900,    // ₹999 × 100
  standard: 250000,  // ₹2,500 × 100
  pro: 500000,       // ₹5,000 × 100
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
