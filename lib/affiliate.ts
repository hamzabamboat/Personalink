/**
 * Single source of truth for affiliate-program constants and pure helpers.
 *
 * Commission model:
 *   - 27.5% of every paid charge (Razorpay or Dodo)
 *   - For 12 months from the referred user's first paid charge
 *   - All commissions stored in INR (converted at credit time via CURRENCY_TO_INR)
 *
 * Cookie model:
 *   - ?ref=CODE is captured by middleware into the `pl_ref` httpOnly cookie
 *   - 30-day attribution window
 *   - Cookie consumed by /api/auth/linkedin/callback on first sign-up
 */

import { CURRENCY_TO_INR, type Currency } from './pricing-config'

export const AFFILIATE_COMMISSION_RATE = 0.275
export const AFFILIATE_COMMISSION_DURATION_MONTHS = 12
export const AFFILIATE_COOKIE_NAME = 'pl_ref'
export const AFFILIATE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30 // 30 days

export const PROMOTION_CHANNELS = [
  'LinkedIn',
  'Newsletter',
  'YouTube',
  'X / Twitter',
  'Instagram',
  'Blog',
  'Podcast',
  'Community / Slack',
  'Other',
] as const
export type PromotionChannel = typeof PROMOTION_CHANNELS[number]

export const AUDIENCE_SIZES = [
  '<1k',
  '1k–10k',
  '10k–50k',
  '50k–250k',
  '250k+',
] as const
export type AudienceSize = typeof AUDIENCE_SIZES[number]

export const PAYOUT_METHODS = [
  'Razorpay (India)',
  'PayPal',
  'Wise',
  'Bank transfer',
] as const
export type PayoutMethod = typeof PAYOUT_METHODS[number]

export const AFFILIATE_STATUSES = ['pending', 'approved', 'rejected', 'suspended'] as const
export type AffiliateStatus = typeof AFFILIATE_STATUSES[number]

/** URL-safe code derived from name + random suffix. Caller is responsible for
 *  collision check against the DB (re-roll if `affiliates.ref_code` already exists). */
export function generateRefCode(name: string): string {
  const slug = name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 8) || 'pl'
  const suffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  return `${slug}${suffix}`
}

/** Convert a payment in any supported currency to INR using the static rate map.
 *  Mirrors the conversion used by the savings calculator on /pricing. */
export function convertToInr(currency: Currency, amount: number): number {
  return Math.round(amount * CURRENCY_TO_INR[currency])
}

/** Apply the 27.5% commission rate to an INR-denominated payment. */
export function commissionAmountInr(paymentInr: number, rate = AFFILIATE_COMMISSION_RATE): number {
  return Math.round(paymentInr * rate * 100) / 100
}

/** ISO date string for the 12-month commission window from a given start. */
export function commissionExpiryFrom(firstPaidAtIso: string, months = AFFILIATE_COMMISSION_DURATION_MONTHS): string {
  const d = new Date(firstPaidAtIso)
  d.setMonth(d.getMonth() + months)
  return d.toISOString()
}

/** Whether a referral is still within its 12-month commission window. */
export function withinCommissionWindow(commissionExpiresAtIso: string | null | undefined, nowIso?: string): boolean {
  if (!commissionExpiresAtIso) return false
  const now = nowIso ? new Date(nowIso) : new Date()
  return new Date(commissionExpiresAtIso) > now
}

/** Canonical share link an affiliate hands out. */
export function buildShareLink(refCode: string, appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://personalink.in'): string {
  const base = appUrl.replace(/\/$/, '')
  return `${base}/?ref=${encodeURIComponent(refCode)}`
}
