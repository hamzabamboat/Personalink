/**
 * Single source of truth for tier limits, pricing, and payment product IDs.
 * Every consumer (API routes, UI components, webhooks, emails) imports from here.
 * Do not re-declare PLAN_LIMITS / PLAN_PRICE / post counts anywhere else.
 *
 * To change a quota or price: edit this file only. To rotate a payment product ID:
 * set the corresponding env var (see DODO_PRODUCT_IDS / RAZORPAY_PLAN_IDS below).
 */

export type TierID = 'free' | 'starter' | 'standard' | 'pro' | 'agency'
export type Currency = 'INR' | 'USD' | 'EUR' | 'GBP'
export type BillingPeriod = 'monthly' | 'annual'

export type FeatureKey =
  | 'posts_generated'
  | 'profile_analyses'
  | 'profile_beautifications'
  | 'voice_transcriptions'
  | 'voice_minutes'
  | 'image_uploads'
  | 'trend_refreshes'
  | 'story_entries'
  | 'story_conversions'
  | 'batch_runs'
  | 'repurpose_runs'
  | 'ai_image_generations'

export interface PerFeatureQuota {
  posts_generated: number
  profile_analyses: number
  profile_beautifications: number
  voice_transcriptions: number
  voice_minutes: number
  image_uploads: number
  trend_refreshes: number
  story_entries: number
  story_conversions: number
  batch_runs: number
  repurpose_runs: number
  ai_image_generations: number
}

export interface TierLimits {
  /** null = unlimited (Pro fingerprints, Agency posts) */
  postsPerMonth: number | null
  voiceFingerprints: number | null
  /** Boolean entitlements used by feature-gating UI. */
  features: {
    watermark: boolean
    scheduling: boolean
    carousel: boolean
    whatsapp: boolean
    priorityFingerprints: boolean
    api: boolean
  }
  /** Granular per-feature counters tracked in usage_tracking table. */
  perFeature: PerFeatureQuota
}

/* ─────────────────────────────────────────────
 * Tier limits
 * ───────────────────────────────────────────── */

export const TIER_LIMITS: Record<TierID, TierLimits> = {
  free: {
    postsPerMonth: 3,
    voiceFingerprints: 1,
    features: {
      watermark: true,
      scheduling: false,
      carousel: false,
      whatsapp: false,
      priorityFingerprints: false,
      api: false,
    },
    perFeature: {
      posts_generated: 3,
      profile_analyses: 1,
      profile_beautifications: 0,
      voice_transcriptions: 0,
      voice_minutes: 0,
      image_uploads: 3,
      trend_refreshes: 2,
      story_entries: 5,
      story_conversions: 2,
      batch_runs: 0,
      repurpose_runs: 0,
      ai_image_generations: 0,
    },
  },
  starter: {
    postsPerMonth: 12,
    voiceFingerprints: 1,
    features: {
      watermark: false,
      scheduling: true,
      carousel: false,
      whatsapp: false,
      priorityFingerprints: false,
      api: false,
    },
    perFeature: {
      posts_generated: 12,
      profile_analyses: 2,
      profile_beautifications: 0,
      voice_transcriptions: 0,
      voice_minutes: 0,
      image_uploads: 10,
      trend_refreshes: 5,
      story_entries: 10,
      story_conversions: 5,
      batch_runs: 1,
      repurpose_runs: 0,
      ai_image_generations: 0,
    },
  },
  standard: {
    postsPerMonth: 22,
    voiceFingerprints: 3,
    features: {
      watermark: false,
      scheduling: true,
      carousel: true,
      whatsapp: true,
      priorityFingerprints: false,
      api: false,
    },
    perFeature: {
      posts_generated: 22,
      profile_analyses: 4,
      profile_beautifications: 1,
      voice_transcriptions: 8,
      voice_minutes: 16,
      image_uploads: 30,
      trend_refreshes: 15,
      story_entries: 30,
      story_conversions: 10,
      batch_runs: 2,
      repurpose_runs: 0,
      ai_image_generations: 15,
    },
  },
  pro: {
    postsPerMonth: 50,
    voiceFingerprints: null, // unlimited
    features: {
      watermark: false,
      scheduling: true,
      carousel: true,
      whatsapp: true,
      priorityFingerprints: true,
      api: true,
    },
    perFeature: {
      posts_generated: 50,
      profile_analyses: 8,
      profile_beautifications: 2,
      voice_transcriptions: 20,
      voice_minutes: 60,
      image_uploads: 80,
      trend_refreshes: 30,
      story_entries: 60,
      story_conversions: 20,
      batch_runs: 4,
      repurpose_runs: 10,
      ai_image_generations: 35,
    },
  },
  agency: {
    postsPerMonth: null, // negotiated
    voiceFingerprints: null,
    features: {
      watermark: false,
      scheduling: true,
      carousel: true,
      whatsapp: true,
      priorityFingerprints: true,
      api: true,
    },
    perFeature: {
      // Effectively unbounded; numbers chosen high enough never to trip in practice.
      posts_generated: 99999,
      profile_analyses: 99999,
      profile_beautifications: 99999,
      voice_transcriptions: 99999,
      voice_minutes: 99999,
      image_uploads: 99999,
      trend_refreshes: 99999,
      story_entries: 99999,
      story_conversions: 99999,
      batch_runs: 99999,
      repurpose_runs: 99999,
      ai_image_generations: 99999,
    },
  },
}

/* ─────────────────────────────────────────────
 * Pricing (per currency, per billing period)
 * ─────────────────────────────────────────────
 * Annual = 25% off monthly × 12 (e.g. 999 × 12 × 0.75 = 8991 INR).
 * Standard USD/GBP stays at $30/£25 — the spec table's $28/£23 was a typo
 * inconsistent with the spec's own annual prices.
 */

export interface TierPriceTable {
  INR: { monthly: number; annual: number }
  USD: { monthly: number; annual: number }
  EUR: { monthly: number; annual: number }
  GBP: { monthly: number; annual: number }
}

export const TIER_PRICING: Record<Exclude<TierID, 'free' | 'agency'>, TierPriceTable> = {
  starter: {
    INR: { monthly: 999, annual: 8991 },
    USD: { monthly: 12, annual: 108 },
    EUR: { monthly: 11, annual: 99 },
    GBP: { monthly: 10, annual: 90 },
  },
  standard: {
    INR: { monthly: 2499, annual: 22491 },
    USD: { monthly: 30, annual: 270 },
    EUR: { monthly: 28, annual: 252 },
    GBP: { monthly: 25, annual: 225 },
  },
  pro: {
    INR: { monthly: 4999, annual: 44991 },
    USD: { monthly: 60, annual: 540 },
    EUR: { monthly: 55, annual: 495 },
    GBP: { monthly: 50, annual: 450 },
  },
}

export const CURRENCY_SYMBOL: Record<Currency, string> = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
}

/* ─────────────────────────────────────────────
 * Payment product / plan IDs (env-driven)
 * ─────────────────────────────────────────────
 * Dodo handles USD/EUR/GBP; Razorpay handles INR.
 * Set the env vars listed below in Vercel for prod + preview.
 */

export interface DodoProductIDs {
  monthly: { USD: string; EUR: string; GBP: string }
  annual: { USD: string; EUR: string; GBP: string }
}

export const DODO_PRODUCT_IDS: Record<Exclude<TierID, 'free' | 'agency'>, DodoProductIDs> = {
  starter: {
    monthly: {
      USD: process.env.DODO_PRODUCT_STARTER_USD ?? '',
      EUR: process.env.DODO_PRODUCT_STARTER_EUR ?? '',
      GBP: process.env.DODO_PRODUCT_STARTER_GBP ?? '',
    },
    annual: {
      USD: process.env.DODO_PRODUCT_STARTER_USD_ANNUAL ?? '',
      EUR: process.env.DODO_PRODUCT_STARTER_EUR_ANNUAL ?? '',
      GBP: process.env.DODO_PRODUCT_STARTER_GBP_ANNUAL ?? '',
    },
  },
  standard: {
    monthly: {
      USD: process.env.DODO_PRODUCT_STANDARD_USD ?? '',
      EUR: process.env.DODO_PRODUCT_STANDARD_EUR ?? '',
      GBP: process.env.DODO_PRODUCT_STANDARD_GBP ?? '',
    },
    annual: {
      USD: process.env.DODO_PRODUCT_STANDARD_USD_ANNUAL ?? '',
      EUR: process.env.DODO_PRODUCT_STANDARD_EUR_ANNUAL ?? '',
      GBP: process.env.DODO_PRODUCT_STANDARD_GBP_ANNUAL ?? '',
    },
  },
  pro: {
    monthly: {
      USD: process.env.DODO_PRODUCT_PRO_USD ?? '',
      EUR: process.env.DODO_PRODUCT_PRO_EUR ?? '',
      GBP: process.env.DODO_PRODUCT_PRO_GBP ?? '',
    },
    annual: {
      USD: process.env.DODO_PRODUCT_PRO_USD_ANNUAL ?? '',
      EUR: process.env.DODO_PRODUCT_PRO_EUR_ANNUAL ?? '',
      GBP: process.env.DODO_PRODUCT_PRO_GBP_ANNUAL ?? '',
    },
  },
}

export interface RazorpayPlanIDs {
  monthly: string
  annual: string
}

export const RAZORPAY_PLAN_IDS: Record<Exclude<TierID, 'free' | 'agency'>, RazorpayPlanIDs> = {
  starter: {
    monthly:
      process.env.RAZORPAY_PLAN_ID_PERSONALINK_STARTER_PLAN ??
      process.env.RAZORPAY_PLAN_ID_STARTER ??
      process.env.RAZORPAY_PLAN_ID ?? '',
    annual: process.env.RAZORPAY_PLAN_ID_STARTER_ANNUAL ?? '',
  },
  standard: {
    monthly:
      process.env.RAZORPAY_PLAN_ID_PERSONALINK_STANDARD_PLAN ??
      process.env.RAZORPAY_PLAN_ID_STANDARD ??
      process.env.RAZORPAY_PLAN_ID ?? '',
    annual: process.env.RAZORPAY_PLAN_ID_STANDARD_ANNUAL ?? '',
  },
  pro: {
    monthly:
      process.env.RAZORPAY_PLAN_ID_PERSONALINK_PRO_PLAN ??
      process.env.RAZORPAY_PLAN_ID_PRO ??
      process.env.RAZORPAY_PLAN_ID ?? '',
    annual: process.env.RAZORPAY_PLAN_ID_PRO_ANNUAL ?? '',
  },
}

/* ─────────────────────────────────────────────
 * Display strings
 * ───────────────────────────────────────────── */

export const TIER_LABEL: Record<TierID, string> = {
  free: 'Free',
  starter: 'Starter',
  standard: 'Standard',
  pro: 'Pro',
  agency: 'Agency',
}

export const TIER_FEATURE_BULLETS: Record<TierID, string[]> = {
  free: [
    '3 posts/month',
    '1 voice fingerprint',
    'AI generation in your voice',
    'Watermark on posts',
  ],
  starter: [
    '12 posts/month',
    '1 voice fingerprint',
    'Post scheduling',
    'No watermark',
    'Story bank · 10 entries · 5 conversions',
    'Trend refreshes · 5/month',
    'Image uploads · 10/month',
    'Profile analyses · 2/month',
    'Batch generation · 1 run/month',
  ],
  standard: [
    '22 posts/month',
    '3 voice fingerprints',
    'Carousel generator',
    'Hinglish + WhatsApp delivery',
    'Everything in Starter, plus —',
    'Voice notes → post · 8/month',
    'AI image generations · 15/month',
    'Story bank · 30 entries · 10 conversions',
    'Image uploads · 30/month',
    'Profile analyses · 4/month',
    'Batch runs · 2/month',
  ],
  pro: [
    '50 posts/month',
    'Unlimited voice fingerprints',
    'Priority fingerprint queue',
    'Zapier + API access',
    'Everything in Standard, plus —',
    'Repurpose engine · 10 runs/month',
    'Voice notes · 20/month · 60 min',
    'AI image generations · 35/month',
    'Story bank · 60 entries · 20 conversions',
    'Image uploads · 80/month',
    'Profile analyses · 8/month',
    'Batch runs · 4/month',
  ],
  agency: [
    'Custom post volume',
    'Unlimited voice fingerprints',
    'Per-client fingerprints + approvals',
    'White-label invoices · GST',
    'Dedicated success manager',
  ],
}

export const FEATURE_LABELS: Record<FeatureKey, string> = {
  posts_generated: 'Post Generations',
  profile_analyses: 'Profile Analyses',
  profile_beautifications: 'Profile Beautifications',
  voice_transcriptions: 'Voice Transcriptions',
  voice_minutes: 'Voice Minutes',
  image_uploads: 'Image Uploads',
  trend_refreshes: 'Trend Refreshes',
  story_entries: 'Story Bank Entries',
  story_conversions: 'Story Conversions',
  batch_runs: 'Batch Generation Runs',
  repurpose_runs: 'Repurpose Runs',
  ai_image_generations: 'AI Image Generations',
}

/* ─────────────────────────────────────────────
 * Country → currency detection
 * ───────────────────────────────────────────── */

const EUR_COUNTRIES = new Set([
  'DE', 'FR', 'IT', 'NL', 'ES', 'BE', 'AT', 'PT', 'IE', 'FI', 'GR', 'LU',
  'SK', 'SI', 'EE', 'LV', 'LT', 'CY', 'MT', 'HR',
])

/**
 * India-first default. When we can't detect a country (no header, no cookie,
 * unrecognised code) we show INR — PersonaLink is built primarily for the
 * Indian market and showing $ or € to an Indian customer is worse than
 * occasionally showing ₹ to a non-Indian (who can switch the picker).
 */
export function detectCurrencyByCountry(country?: string | null): Currency {
  if (!country) return 'INR'
  const c = country.toUpperCase()
  if (c === 'IN') return 'INR'
  if (c === 'US' || c === 'CA' || c === 'AU' || c === 'NZ' || c === 'SG' || c === 'HK' || c === 'JP') return 'USD'
  if (c === 'GB' || c === 'UK') return 'GBP'
  if (EUR_COUNTRIES.has(c)) return 'EUR'
  return 'INR'
}

export function getPaymentProcessor(currency: Currency): 'razorpay' | 'dodo' {
  return currency === 'INR' ? 'razorpay' : 'dodo'
}

/* ─────────────────────────────────────────────
 * Pure helpers
 * ───────────────────────────────────────────── */

export function getTierLimits(tier: TierID | string | null | undefined): TierLimits {
  const key = (tier ?? 'free') as TierID
  return TIER_LIMITS[key] ?? TIER_LIMITS.free
}

export function canGeneratePost(tier: TierID | string | null | undefined, usedThisMonth: number): boolean {
  const limit = getTierLimits(tier).postsPerMonth
  if (limit === null) return true
  return usedThisMonth < limit
}

export function shouldShowWarning(tier: TierID | string | null | undefined, usedThisMonth: number): boolean {
  const limit = getTierLimits(tier).postsPerMonth
  if (limit === null) return false
  return usedThisMonth >= Math.floor(limit * 0.8) && usedThisMonth < limit
}

export function getRemainingPosts(tier: TierID | string | null | undefined, usedThisMonth: number): number | null {
  const limit = getTierLimits(tier).postsPerMonth
  if (limit === null) return null
  return Math.max(0, limit - usedThisMonth)
}

const TIER_LADDER: TierID[] = ['free', 'starter', 'standard', 'pro']

/** Returns the next paid tier above the given one, or null if already at the top. Agency is excluded from auto-upgrade. */
export function getNextTier(tier: TierID | string | null | undefined): TierID | null {
  const idx = TIER_LADDER.indexOf((tier ?? 'free') as TierID)
  if (idx === -1 || idx >= TIER_LADDER.length - 1) return null
  return TIER_LADDER[idx + 1]
}

/** Numeric rank for comparing tiers (free=0, starter=1, standard=2, pro=3, agency=4). */
export function tierRank(tier: TierID | string | null | undefined): number {
  const key = (tier ?? 'free') as TierID
  const order: Record<TierID, number> = { free: 0, starter: 1, standard: 2, pro: 3, agency: 4 }
  return order[key] ?? 0
}

export function tierLabel(tier: TierID | string | null | undefined): string {
  const key = (tier ?? 'free') as TierID
  return TIER_LABEL[key] ?? 'Free'
}

/** Get monthly or annual price as a number. Returns null for free/agency. */
export function getPrice(tier: TierID, currency: Currency, period: BillingPeriod = 'monthly'): number | null {
  if (tier === 'free' || tier === 'agency') return null
  return TIER_PRICING[tier][currency][period]
}

/** Format a price for display (currency symbol + locale-thousands). */
export function formatPrice(currency: Currency, amount: number): string {
  return `${CURRENCY_SYMBOL[currency]}${amount.toLocaleString(currency === 'INR' ? 'en-IN' : 'en-US')}`
}

/** Used for INR-equivalent MRR display in admin dashboards. Update periodically. */
export const CURRENCY_TO_INR: Record<Currency, number> = {
  INR: 1,
  USD: 84,
  GBP: 107,
  EUR: 90,
}
