/**
 * Single source of truth for /vs/* comparison pages.
 *
 * All competitor prices stored in USD; INR is computed at runtime by passing a
 * live `rate` (USD→INR) to getCompetitor() / getAllCompetitors() / calcYearOne(),
 * so every page reflects the current exchange rate. Personalink prices pull from
 * `lib/currency.ts` so changes there propagate automatically.
 */

import { CURRENCIES } from '@/lib/currency'
import { TIER_LIMITS } from '@/lib/pricing-config'

export type Symbol = '✅' | '❌' | '⚠️'

export type FeatureRow = {
  label: string
  pl: Symbol | string
  competitor: Symbol | string
  /** 'pl' tints the Personalink cell green; 'competitor' tints competitor cell red. */
  highlight?: 'pl' | 'competitor'
  /** Optional tooltip-style note shown small under the row. */
  note?: string
}

export type CompetitorPlan = {
  name: string
  /** Monthly recurring price in USD. `null` for lifetime/one-time plans. */
  monthlyUsd: number | null
  /** One-time price in USD for lifetime plans. */
  oneTimeUsd?: number
  /** Approximate monthly post budget this plan is meant to cover. */
  postBudget: number
  /** Agency seats / accounts included on this plan (1 = solo). */
  seats: number
}

export type CompetitorFAQ = { q: string; a: string }
export type Honest = { title: string; body: string }
export type MigrationStep = { title: string; body: string }

export type Competitor = {
  slug: 'taplio' | 'kleo' | 'supergrow' | 'authoredup' | 'easygen' | 'contentin' | 'magicpost'
  /** Brand name as printed publicly. */
  name: string
  /** One-line positioning of the competitor (used in hero subhead). */
  oneLiner: string
  /** Recurring SaaS vs lifetime one-time pricing. */
  pricingModel: 'recurring' | 'lifetime'
  /** Public plan tiers, ordered cheapest → most expensive. */
  plans: CompetitorPlan[]
  /** Hero subhead format args. */
  hero: {
    subhead: string
    /** Annual savings cap, used in headline if formatted with {{save}}. */
    headlineSavings: number
  }
  /** Comparison table rows (16–18 per page). */
  features: FeatureRow[]
  /** When the competitor might be a better fit (2 items). */
  honest: Honest[]
  /** Long-tail FAQ (10 items). */
  faq: CompetitorFAQ[]
  /** Migration steps (3 items). */
  migration: MigrationStep[]
  /** Placeholder customer quote — will be swapped for real testimonial later. */
  quote: { body: string; name: string; role: string }
}

/* ────────────────────────────────────────────────────────────────────
 * Personalink plans (mirror of /lib/currency.ts INR pricing)
 * ──────────────────────────────────────────────────────────────────── */

export const PL_PLANS = {
  starter: { name: 'Starter', inr: CURRENCIES.IN.starter, postBudget: TIER_LIMITS.starter.postsPerMonth ?? 12 },
  standard: { name: 'Standard', inr: CURRENCIES.IN.standard, postBudget: TIER_LIMITS.standard.postsPerMonth ?? 22 },
  pro: { name: 'Pro', inr: CURRENCIES.IN.pro, postBudget: TIER_LIMITS.pro.postsPerMonth ?? 50 },
} as const

export type PLPlanId = keyof typeof PL_PLANS

/** Map a creator's monthly post volume to the cheapest PL plan that fits. */
export function pickPlPlanFor(postsPerMonth: number): PLPlanId {
  if (postsPerMonth <= PL_PLANS.starter.postBudget) return 'starter'
  if (postsPerMonth <= PL_PLANS.standard.postBudget) return 'standard'
  return 'pro'
}

/** Map a creator's monthly post volume to the closest competitor plan. */
export function pickCompetitorPlanFor(competitor: Competitor, postsPerMonth: number): CompetitorPlan {
  // Find the first plan whose budget covers the volume; fall back to last (largest).
  const fit = competitor.plans.find(p => postsPerMonth <= p.postBudget)
  return fit ?? competitor.plans[competitor.plans.length - 1]
}

export const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`

export type CompetitorSlug = Competitor['slug']
export const COMPETITOR_SLUGS: CompetitorSlug[] = ['taplio', 'kleo', 'supergrow', 'authoredup', 'easygen', 'contentin', 'magicpost']

/** Raw USD plans — rate-independent, the source of truth for prices. */
export const COMPETITOR_PLANS: Record<CompetitorSlug, CompetitorPlan[]> = {
  taplio: [
    { name: 'Standard', monthlyUsd: 39, postBudget: 30, seats: 1 },
    { name: 'Pro', monthlyUsd: 65, postBudget: 90, seats: 1 },
    { name: 'Agency', monthlyUsd: 199, postBudget: 300, seats: 5 },
  ],
  kleo: [
    { name: 'Lifetime', monthlyUsd: null, oneTimeUsd: 99, postBudget: 999, seats: 1 },
  ],
  supergrow: [
    { name: 'Solo', monthlyUsd: 19, postBudget: 30, seats: 1 },
    { name: 'Pro', monthlyUsd: 39, postBudget: 90, seats: 1 },
  ],
  authoredup: [
    { name: 'Individual', monthlyUsd: 19.95, postBudget: 999, seats: 1 },
    { name: 'Business', monthlyUsd: 14.95, postBudget: 999, seats: 3 },
  ],
  easygen: [
    { name: 'Pro', monthlyUsd: 59.99, postBudget: 999, seats: 1 },
  ],
  contentin: [
    { name: 'Essentials', monthlyUsd: 15, postBudget: 0, seats: 1 },
    { name: 'Growth', monthlyUsd: 31, postBudget: 12, seats: 1 },
    { name: 'Pro', monthlyUsd: 48, postBudget: 999, seats: 1 },
  ],
  magicpost: [
    { name: 'Analytics', monthlyUsd: 21, postBudget: 0, seats: 1 },
    { name: 'Creator', monthlyUsd: 39, postBudget: 90, seats: 1 },
  ],
}

/* ────────────────────────────────────────────────────────────────────
 * Common comparison rows (Personalink advantages that apply to every
 * competitor are defined here and merged into each page's data).
 * ──────────────────────────────────────────────────────────────────── */

const indiaRows: FeatureRow[] = [
  { label: 'INR-native billing (no FX surcharge)', pl: '✅', competitor: '❌ USD billing', highlight: 'pl', note: 'Indian cards routinely lose 2–4% on international transactions and trigger 2FA failures.' },
  { label: 'GST invoice for business expense', pl: '✅ GSTIN on every invoice', competitor: '❌', highlight: 'pl', note: 'You can claim PersonaLink as a business expense and recover 18% input tax credit.' },
  { label: 'Hinglish & code-mixed posts', pl: '✅ Native', competitor: '❌ English only', highlight: 'pl' },
  { label: 'India-aware trends & hooks', pl: '✅', competitor: '⚠️ Global only', highlight: 'pl' },
  { label: 'UPI / Razorpay payments', pl: '✅', competitor: '❌ Card only', highlight: 'pl' },
  { label: 'Support during IST business hours', pl: '✅', competitor: '⚠️', highlight: 'pl' },
]

const voiceRows: FeatureRow[] = [
  { label: 'Voice fingerprint depth (6 dimensions)', pl: '✅ Rhythm · vocabulary · hook · warmth · openings · punctuation', competitor: '⚠️ Style match only' },
  { label: 'Voice notes → post', pl: '✅', competitor: '❌', highlight: 'pl' },
  { label: 'Story bank (reusable lived experiences)', pl: '✅', competitor: '⚠️' },
  { label: 'Voice retuning on edits', pl: '✅ Continuous', competitor: '❌ One-time at setup' },
  { label: 'AI image generation in your brand style', pl: '✅', competitor: '⚠️ Stock library only' },
]

const trustRows: FeatureRow[] = [
  { label: '7-day free trial', pl: '✅', competitor: '⚠️ 7-day, card required up front' },
  { label: 'Cancel in one click', pl: '✅', competitor: '⚠️ Email required' },
  { label: 'Official LinkedIn OAuth (read-only beyond posting)', pl: '✅', competitor: '✅' },
]

/* ────────────────────────────────────────────────────────────────────
 * TAPLIO
 * ──────────────────────────────────────────────────────────────────── */

function buildTaplio(rate: number): Competitor {
  return {
  slug: 'taplio',
  name: 'Taplio',
  oneLiner: 'Polished feature set, but billed in USD with no Indian tax compliance.',
  pricingModel: 'recurring',
  plans: COMPETITOR_PLANS.taplio,
  hero: {
    subhead: 'Same features. Pay in INR. Get GST invoices. Save up to {{save}}/year.',
    headlineSavings: Math.round((65 * rate - PL_PLANS.standard.inr) * 12),
  },
  features: [
    { label: 'Entry-level monthly price', pl: inr(PL_PLANS.starter.inr), competitor: `${inr(39 * rate)} ($39)`, highlight: 'pl' },
    { label: 'Mid-tier monthly price', pl: inr(PL_PLANS.standard.inr), competitor: `${inr(65 * rate)} ($65)`, highlight: 'pl' },
    { label: 'Top tier monthly price', pl: 'Custom (agency form)', competitor: `${inr(199 * rate)} ($199)`, highlight: 'pl' },
    ...indiaRows,
    ...voiceRows,
    { label: 'Multi-account / agency mode', pl: '✅ Custom-priced', competitor: '✅ Agency tier ($199)' },
    { label: 'Repurpose engine (turn 1 post → 5 formats)', pl: '✅', competitor: '⚠️ Manual remix' },
    { label: 'Approval workflow (autopilot / approve / suggest)', pl: '✅ Three modes', competitor: '⚠️ Approve before publish only' },
    { label: 'Carousel generator', pl: '⚠️ Beta', competitor: '✅', highlight: 'competitor' },
    { label: 'Public viral-post inspiration library', pl: '⚠️', competitor: '✅', highlight: 'competitor' },
    ...trustRows,
  ],
  honest: [
    {
      title: 'When Taplio might be a better fit',
      body: 'If your audience is entirely outside India and you want a polished carousel maker plus a chrome extension that surfaces viral posts inline on your LinkedIn feed, Taplio\'s inspiration library is still industry-leading.',
    },
    {
      title: 'If you already have a Taplio annual subscription',
      body: 'Taplio offers 25% off annual billing. If you pre-paid an annual seat, finish your term — then migrate. Email migrate@personalink.in and we\'ll match the remaining months on your Personalink plan free.',
    },
  ],
  faq: [
    {
      q: 'Is Personalink really cheaper than Taplio?',
      a: `Yes. Taplio\'s Standard plan is $39/month (about ${inr(39 * rate)} at today\'s rates) plus FX fees. Personalink Standard is ${inr(PL_PLANS.standard.inr)}/month, billed in INR, GST-compliant. Annual savings on the mid-tier alone work out to roughly ${inr((65 * rate - PL_PLANS.standard.inr) * 12)}.`,
    },
    {
      q: 'Can I import my Taplio scheduled posts?',
      a: 'Yes. Export your scheduled queue from Taplio (Settings → Export CSV), email it to migrate@personalink.in, and we\'ll reimport every scheduled draft into your Personalink queue within 24 hours. No reschedule work on your side.',
    },
    {
      q: 'Does Personalink support GST invoices?',
      a: 'Every invoice carries our GSTIN and your registered business name. You can claim Personalink as a deductible business expense and recover the 18% GST as input tax credit — something USD-billed tools like Taplio cannot offer Indian businesses.',
    },
    {
      q: 'Will my Taplio voice fingerprint transfer?',
      a: 'You can\'t export Taplio\'s style profile, but our voice analysis is deeper anyway. Paste 3 of your best posts at personalink.in/voice-analyzer — we\'ll score 6 voice dimensions in 30 seconds, free, no signup.',
    },
    {
      q: 'Does Personalink integrate with LinkedIn the same way as Taplio?',
      a: 'Same official LinkedIn OAuth. We only request posting permission — no DM reading, no network scraping, no password storage. Identical security model.',
    },
    {
      q: 'Is Personalink available outside India?',
      a: 'Yes — we bill in USD, GBP, EUR for non-India accounts via Dodo Payments. But India is our home market, which is why we lead with INR and GST.',
    },
    {
      q: 'Can I run Personalink for an agency with 10+ clients?',
      a: 'Yes, but agency pricing is custom (every agency has different seat, voice, and white-label needs). Fill out the agency form at /for-agencies and we\'ll send a quote within one working day — typically 50–70% cheaper than Taplio\'s $199 Agency tier.',
    },
    {
      q: 'What about Hinglish posts?',
      a: 'Personalink natively writes in code-mixed Hinglish (e.g., "yeh wala launch thoda different hai"). Taplio is English-only and tends to formalise Hindi-English blends into either pure English or transliterated Hindi.',
    },
    {
      q: 'Do you have a free trial?',
      a: 'Yes, 7 days, no card required. Taplio\'s 7-day trial requires a card up front and auto-charges if you forget to cancel.',
    },
    {
      q: 'What if I want to switch back?',
      a: 'One-click cancellation in Settings. You keep access until the end of your billing period. We\'ll also export your story bank, voice fingerprint, and scheduled posts as a JSON bundle — no lock-in.',
    },
  ],
  migration: [
    { title: 'Export from Taplio', body: 'Settings → Export queue. You\'ll get a CSV of every scheduled post.' },
    { title: 'Sign up to Personalink', body: 'Connect with LinkedIn OAuth and start your 7-day free trial — no card required.' },
    { title: 'Paste 3 sample posts', body: 'We build your voice fingerprint in 30 seconds, then auto-import your CSV when you email it to migrate@personalink.in.' },
  ],
  quote: {
    body: 'Switched from Taplio after 6 months. Posts read more like me, billing finally makes sense for my CA, and the Hinglish support is unreal. Wish I\'d found it earlier.',
    name: '— Real testimonial coming soon',
    role: 'Founder · Bengaluru (placeholder)',
  },
  }
}

/* ────────────────────────────────────────────────────────────────────
 * KLEO
 * ──────────────────────────────────────────────────────────────────── */

function buildKleo(rate: number): Competitor {
  return {
  slug: 'kleo',
  name: 'Kleo',
  oneLiner: 'Lifetime deal up front. Static toolkit, no ongoing improvements.',
  pricingModel: 'lifetime',
  plans: COMPETITOR_PLANS.kleo,
  hero: {
    subhead: 'Recurring tool, lifetime value. Pay in INR. Get GST invoices. Built for India.',
    headlineSavings: 60000,
  },
  features: [
    { label: 'Pricing model', pl: 'Monthly subscription (cancel anytime)', competitor: 'One-time $99 lifetime' },
    { label: 'Entry price', pl: inr(PL_PLANS.starter.inr) + '/mo', competitor: `${inr(99 * rate)} once ($99)` },
    { label: 'Ongoing model improvements', pl: '✅ Weekly', competitor: '❌ Static at purchase', highlight: 'pl' },
    { label: 'New features without paying again', pl: '✅', competitor: '⚠️ Add-ons priced separately', highlight: 'pl' },
    ...indiaRows,
    ...voiceRows,
    { label: 'Auto-publish on schedule', pl: '✅', competitor: '⚠️ Draft assist only', highlight: 'pl' },
    { label: 'Repurpose engine (turn 1 post → 5 formats)', pl: '✅', competitor: '❌', highlight: 'pl' },
    { label: 'Approval workflow (autopilot / approve / suggest)', pl: '✅ Three modes', competitor: '❌ Manual copy-paste', highlight: 'pl' },
    { label: 'Trend tracker', pl: '✅', competitor: '❌', highlight: 'pl' },
    { label: 'Built-in carousel builder', pl: '⚠️ Beta', competitor: '✅ Mature', highlight: 'competitor' },
    { label: 'Voice cloning depth', pl: '✅ 6-dimension fingerprint', competitor: '⚠️ Style match' },
    ...trustRows,
  ],
  honest: [
    {
      title: 'When Kleo might be a better fit',
      body: 'If you post sporadically — once a fortnight or just for product launches — Kleo\'s $99 lifetime deal is hard to beat. Personalink only pays off if you\'re actively posting and want ongoing voice tuning, trend tracking, and auto-publishing.',
    },
    {
      title: 'If you bought Kleo lifetime already',
      body: 'Keep using Kleo for what it does well (carousels). Add Personalink for the things Kleo can\'t do — auto-publish, voice notes → post, trend tracker. Email migrate@personalink.in for a 30% lifetime discount as a Kleo customer.',
    },
  ],
  faq: [
    {
      q: 'Why is Kleo only $99 while Personalink is monthly?',
      a: 'Kleo sells a one-time lifetime license. You buy it, it stops getting better. Personalink is a recurring subscription so we can keep training the model on what\'s actually working on LinkedIn — and reinvest in trends, voice tuning, and new features. Different model, different value.',
    },
    {
      q: 'Is Personalink really worth more than Kleo lifetime?',
      a: `If you post 4+ times a month, yes. Kleo gives you static drafting tools. Personalink gives you ongoing voice retuning, trend refreshes, voice-notes → post, auto-publishing, and India-localised hooks. Break-even for active creators is ~3 months.`,
    },
    {
      q: 'Can I import my Kleo scheduled drafts?',
      a: 'Kleo doesn\'t schedule posts itself — it generates drafts you copy-paste. Email migrate@personalink.in any drafts you want preserved, we\'ll import them and rebuild a publishing schedule for you.',
    },
    {
      q: 'Does Personalink support GST invoices?',
      a: 'Yes — every invoice carries our GSTIN and your registered business name. Kleo bills in USD via Lemon Squeezy and does not provide India GST invoices.',
    },
    {
      q: 'What if I just want carousels?',
      a: 'Honest answer: Kleo\'s carousel builder is more mature today. Our beta is closing the gap fast — but if 80% of your content is carousels, Kleo is still defensible. For text-first founders, Personalink wins on voice match and auto-publish.',
    },
    {
      q: 'Will the posts actually sound like me?',
      a: 'During onboarding we ingest 3–5 of your best posts and build a 6-dimension voice fingerprint — rhythm, vocabulary, openings, pet phrases, emotional register, punctuation tics. Every draft is constrained to that fingerprint, so it reads like you wrote it.',
    },
    {
      q: 'Can I run Personalink for an agency?',
      a: 'Yes — agency pricing is custom. Fill the agency form at /for-agencies and we\'ll send a quote within one working day. Kleo doesn\'t natively support multi-client workflows.',
    },
    {
      q: 'Do you support Hinglish posts?',
      a: 'Yes, natively. We write in code-mixed Hinglish without forcing translation. Kleo\'s English-only model tends to flatten Indian-English voices.',
    },
    {
      q: 'Is there a free trial?',
      a: '7 days, no card required. Kleo has a 7-day money-back guarantee instead — you pay $99 first, then ask for a refund if it\'s not for you.',
    },
    {
      q: 'Can I cancel anytime?',
      a: 'One click in Settings — you keep access until end of billing period. With Kleo, there\'s nothing to cancel — but there\'s also no upgrade path if you outgrow it.',
    },
  ],
  migration: [
    { title: 'Save your Kleo drafts', body: 'Copy any drafts you want to keep into a plain doc — Kleo doesn\'t export by default.' },
    { title: 'Sign up to Personalink', body: 'LinkedIn OAuth, 7-day free trial, no card required.' },
    { title: 'Paste 3 sample posts', body: 'We build your voice fingerprint and import your old drafts. Email migrate@personalink.in for help.' },
  ],
  quote: {
    body: 'Bought Kleo last year, used it twice. Bought Personalink last month, used it every day. The difference is auto-publish and a tool that keeps learning.',
    name: '— Real testimonial coming soon',
    role: 'Consultant · Mumbai (placeholder)',
  },
  }
}

/* ────────────────────────────────────────────────────────────────────
 * SUPERGROW
 * ──────────────────────────────────────────────────────────────────── */

function buildSupergrow(rate: number): Competitor {
  return {
  slug: 'supergrow',
  name: 'Supergrow',
  oneLiner: 'Cheap and simple. Misses voice depth, India localisation, and auto-publish.',
  pricingModel: 'recurring',
  plans: COMPETITOR_PLANS.supergrow,
  hero: {
    subhead: 'Roughly the same price. Twice the depth. Pay in INR. Get GST invoices.',
    headlineSavings: Math.round((19 * rate - PL_PLANS.starter.inr) * 12),
  },
  features: [
    { label: 'Entry-level monthly price', pl: inr(PL_PLANS.starter.inr), competitor: `${inr(19 * rate)} ($19)`, highlight: 'pl' },
    { label: 'Mid-tier monthly price', pl: inr(PL_PLANS.standard.inr), competitor: `${inr(39 * rate)} ($39)`, highlight: 'pl' },
    ...indiaRows,
    ...voiceRows,
    { label: 'Auto-publish on schedule', pl: '✅', competitor: '✅' },
    { label: 'Approval workflow (autopilot / approve / suggest)', pl: '✅ Three modes', competitor: '⚠️ Approve only' },
    { label: 'Voice notes → post', pl: '✅', competitor: '❌', highlight: 'pl' },
    { label: 'Story bank', pl: '✅', competitor: '❌', highlight: 'pl' },
    { label: 'Repurpose engine', pl: '✅', competitor: '⚠️', highlight: 'pl' },
    { label: 'Trend tracker (India + global)', pl: '✅', competitor: '⚠️ Global only' },
    { label: 'Agency mode (multi-client)', pl: '✅ Custom-priced', competitor: '❌', highlight: 'pl' },
    ...trustRows,
  ],
  honest: [
    {
      title: 'When Supergrow might be a better fit',
      body: 'If you want the cheapest possible LinkedIn scheduler and don\'t care about voice depth, Hinglish, GST, or repurposing content — Supergrow\'s $19 plan is genuinely the lowest sticker price in the market.',
    },
    {
      title: 'If you\'re an absolute beginner',
      body: 'Supergrow\'s onboarding is two screens. Personalink\'s is six (voice samples, tone calibration, story bank seeding). If you just want to get one post live tonight, Supergrow is faster. If you want every post to sound like you for the next year, Personalink is the trade.',
    },
  ],
  faq: [
    {
      q: 'Is Personalink cheaper than Supergrow?',
      a: `On entry tier, yes — ${inr(PL_PLANS.starter.inr)}/mo vs Supergrow\'s ${inr(19 * rate)}/mo equivalent ($19 + FX + lack of GST credit). On Pro: ${inr(PL_PLANS.standard.inr)} vs ${inr(39 * rate)}. Personalink also recovers 18% GST as input tax credit for Indian businesses.`,
    },
    {
      q: 'What does Supergrow miss that Personalink has?',
      a: 'Voice notes → post, story bank, repurpose engine, Hinglish, India-aware trends, agency mode, voice fingerprint depth. Supergrow is essentially a scheduler with AI drafts; Personalink is a full voice + publishing system.',
    },
    {
      q: 'Can I import my Supergrow scheduled posts?',
      a: 'Yes. Export from Supergrow (Settings → Data export), email the CSV to migrate@personalink.in, and we\'ll reimport every scheduled draft into your queue within 24 hours.',
    },
    {
      q: 'Does Personalink support GST invoices?',
      a: 'Every invoice carries our GSTIN and your registered business name. Supergrow bills in USD via Stripe and does not provide India GST invoices.',
    },
    {
      q: 'Will my voice actually sound different?',
      a: 'Yes — Supergrow uses a single style prompt. Personalink fingerprints six voice dimensions (rhythm, vocabulary, openings, pet phrases, warmth, punctuation tics) and constrains every draft inside that space, so it reads like you rather than generic AI.',
    },
    {
      q: 'Is the post quality measurably better?',
      a: 'Personalink is built so drafts need fewer edits before publish — the voice fingerprint constrains every draft to your style. We\'re happy to share user tests on request — email hello@personalink.in.',
    },
    {
      q: 'Does Personalink have an agency plan?',
      a: 'Yes, custom-priced. Fill out the agency form at /for-agencies for a quote — typically priced per seat with white-label options. Supergrow has no multi-client workflow.',
    },
    {
      q: 'Do you support Hinglish?',
      a: 'Natively. We write in code-mixed Hinglish without forcing translation. Supergrow\'s English-only model flattens Indian-English voices.',
    },
    {
      q: 'Is there a free trial?',
      a: '7 days, no card required. Supergrow offers a 7-day trial that auto-converts to paid (card required up front).',
    },
    {
      q: 'Can I cancel anytime?',
      a: 'One click in Settings — you keep access until end of billing period. No surprise charges, no win-back emails.',
    },
  ],
  migration: [
    { title: 'Export from Supergrow', body: 'Settings → Data export. You\'ll get a CSV of scheduled posts and drafts.' },
    { title: 'Sign up to Personalink', body: 'LinkedIn OAuth, 7-day free trial, no card required.' },
    { title: 'Paste 3 sample posts', body: 'We build your voice fingerprint and import your CSV when you email it to migrate@personalink.in.' },
  ],
  quote: {
    body: 'Supergrow got me started, Personalink got me consistent. The voice match is what made me cancel.',
    name: '— Real testimonial coming soon',
    role: 'B2B consultant · Delhi (placeholder)',
  },
  }
}

/* ────────────────────────────────────────────────────────────────────
 * AUTHOREDUP
 * ──────────────────────────────────────────────────────────────────── */

function buildAuthoredup(rate: number): Competitor {
  return {
  slug: 'authoredup',
  name: 'AuthoredUp',
  oneLiner: 'Best-in-class LinkedIn formatting, previews and analytics — but no AI writing, and billed in USD.',
  pricingModel: 'recurring',
  plans: COMPETITOR_PLANS.authoredup,
  hero: {
    subhead: 'AuthoredUp formats your posts. PersonaLink writes them — in your voice, in INR, with GST invoices.',
    headlineSavings: Math.round((19.95 * rate - PL_PLANS.starter.inr) * 12),
  },
  features: [
    { label: 'Entry-level monthly price', pl: inr(PL_PLANS.starter.inr), competitor: `${inr(19.95 * rate)} ($19.95)`, highlight: 'pl' },
    { label: 'Annual effective monthly price', pl: inr(Math.round(PL_PLANS.starter.inr * 0.75)), competitor: `${inr(16.63 * rate)} ($16.63)`, highlight: 'pl' },
    { label: 'Permanent free tier', pl: '✅ 3 posts/month free', competitor: '❌ 14-day trial only', highlight: 'pl' },
    { label: 'AI writing in your voice', pl: '✅ 6-dimension voice fingerprint', competitor: '❌ No AI — you write every post', highlight: 'pl', note: 'AuthoredUp deliberately excludes AI content generation; it is a formatting & analytics layer, not a writer.' },
    { label: 'Voice notes → post', pl: '✅', competitor: '❌', highlight: 'pl' },
    { label: 'Repurpose engine (1 post → 5 formats)', pl: '✅', competitor: '❌', highlight: 'pl' },
    { label: 'Anti-AI humanizer', pl: '✅', competitor: '— (no AI output to humanize)', highlight: 'pl' },
    ...indiaRows,
    { label: 'Auto-publish on schedule', pl: '✅', competitor: '✅' },
    { label: 'Rich-text post formatter (bold, italics, lists)', pl: '⚠️ Basic', competitor: '✅ Best-in-class', highlight: 'competitor' },
    { label: 'Inline post preview (desktop & mobile)', pl: '⚠️', competitor: '✅ Mature', highlight: 'competitor' },
    { label: 'Hook & template library', pl: '⚠️ Built into drafts', competitor: '✅ 300+ hooks', highlight: 'competitor' },
    { label: 'Analytics on your post history', pl: '✅ What resonates', competitor: '✅ Deeper, in-feed' },
    { label: 'Works without a browser extension', pl: '✅ Web app + LinkedIn OAuth', competitor: '⚠️ Chrome/Edge extension required', highlight: 'pl' },
    { label: 'Free trial', pl: '✅ 7-day, no card', competitor: '✅ 14-day, no card' },
    { label: 'Cancel in one click', pl: '✅', competitor: '⚠️ Account settings' },
  ],
  honest: [
    {
      title: 'When AuthoredUp might be a better fit',
      body: 'If you prefer to write every post yourself and just want the best in-editor formatting, device previews, a big hook library, and detailed analytics on your own posts, AuthoredUp is genuinely excellent. It is a writing-enhancement layer, not an AI writer — so if you do not want AI drafting, PersonaLink is not what you need.',
    },
    {
      title: 'You can use both',
      body: 'They solve different problems: PersonaLink drafts in your voice and auto-publishes; AuthoredUp polishes formatting and shows analytics. Plenty of creators run both. But if you are choosing one tool and want the AI to do the writing — in INR, with a GST invoice — PersonaLink is the pick.',
    },
  ],
  faq: [
    { q: 'Does AuthoredUp write LinkedIn posts for you?', a: 'No. AuthoredUp deliberately has no AI content generation — it is a formatting, preview and analytics tool, so you write every post yourself. PersonaLink drafts posts in your own voice using a 6-dimension voice fingerprint, then lets you approve or auto-publish.' },
    { q: 'Is PersonaLink cheaper than AuthoredUp?', a: `AuthoredUp Individual is $19.95/month (about ${inr(19.95 * rate)} at today's rate) plus FX fees, with no GST invoice. PersonaLink Starter is ${inr(PL_PLANS.starter.inr)}/month, billed in INR with a GST invoice — and there is a permanent free tier. For Indian businesses the 18% GST input credit widens the gap further.` },
    { q: 'Does AuthoredUp support INR billing or GST invoices?', a: 'No — AuthoredUp bills in USD and cannot issue an India GST invoice. PersonaLink bills in INR via Razorpay (UPI + cards) and puts a GSTIN on every invoice so you can claim input tax credit.' },
    { q: 'Can I use AuthoredUp and PersonaLink together?', a: 'Yes — they are complementary. Use PersonaLink to draft in your voice and publish, and AuthoredUp to fine-tune formatting and study analytics. If you only want one, pick based on whether you want the AI to write (PersonaLink) or to write yourself with better tooling (AuthoredUp).' },
    { q: 'Does AuthoredUp do Hinglish posts?', a: 'No. AuthoredUp is a formatting tool with an English interface and no Indian localisation. PersonaLink natively writes code-mixed Hinglish without forcing translation into pure English or Hindi.' },
    { q: "Does PersonaLink have AuthoredUp's formatting and analytics?", a: "Honest answer: AuthoredUp's in-feed formatter, device previews and post analytics are more mature today. PersonaLink focuses on drafting in your voice and surfacing what resonates. If best-in-class formatting is your priority and you write your own posts, AuthoredUp leads there." },
    { q: 'Does AuthoredUp need a browser extension?', a: 'Yes — AuthoredUp is primarily a Chrome/Edge extension that works inside your logged-in LinkedIn session. PersonaLink is a web app that connects through official LinkedIn OAuth with posting-only permission (no DM reading, no scraping, no password sharing).' },
    { q: 'Which has the better free trial?', a: 'AuthoredUp offers a 14-day trial with no card required. PersonaLink offers a 7-day trial with no card, plus a permanent free tier (3 posts/month) so you can keep using it without paying.' },
    { q: 'Will the posts actually sound like me?', a: 'With PersonaLink, yes — every draft is constrained to a 6-dimension fingerprint of your past posts (rhythm, vocabulary, openings, pet phrases, warmth, punctuation). AuthoredUp does not generate content, so the voice is entirely up to you.' },
    { q: 'Can I cancel anytime?', a: 'PersonaLink cancels in one click in Settings and you keep access to the end of the billing period. AuthoredUp subscriptions are cancellable from account settings.' },
  ],
  migration: [
    { title: 'Keep AuthoredUp if you like its formatter', body: 'You do not have to remove it — AuthoredUp and PersonaLink solve different problems and can run side by side.' },
    { title: 'Sign up to PersonaLink', body: 'Connect with official LinkedIn OAuth and start on the free tier or a 7-day trial — no card required.' },
    { title: 'Paste 3 sample posts', body: 'We build your 6-dimension voice fingerprint in about 30 seconds, then you can draft in your voice and auto-publish.' },
  ],
  quote: {
    body: 'I used AuthoredUp to format posts I still had to write myself. PersonaLink writes the first draft in my voice — then I polish. Different jobs, but the writing was the part I needed help with.',
    name: '— Real testimonial coming soon',
    role: 'Founder · India (placeholder)',
  },
  }
}

/* ────────────────────────────────────────────────────────────────────
 * EASYGEN
 * ──────────────────────────────────────────────────────────────────── */

function buildEasygen(rate: number): Competitor {
  return {
  slug: 'easygen',
  name: 'EasyGen',
  oneLiner: 'A well-known LinkedIn AI writer — but a single $59.99/mo plan, no free tier, and USD-only.',
  pricingModel: 'recurring',
  plans: COMPETITOR_PLANS.easygen,
  hero: {
    subhead: 'The same LinkedIn AI writing, at a fraction of the price. Pay in INR, get GST invoices, post in Hinglish.',
    headlineSavings: Math.round((59.99 * rate - PL_PLANS.starter.inr) * 12),
  },
  features: [
    { label: 'Entry-level monthly price', pl: inr(PL_PLANS.starter.inr), competitor: `${inr(59.99 * rate)} ($59.99)`, highlight: 'pl', note: 'EasyGen has one plan at $59.99/mo ($49.99 billed annually).' },
    { label: 'Permanent free tier', pl: '✅ 3 posts/month free', competitor: '❌ 3 sample posts, then a 7-day trial', highlight: 'pl' },
    { label: 'AI writing in your voice', pl: '✅ 6-dimension voice fingerprint', competitor: '✅ Style-based generation' },
    { label: 'Voice notes → post', pl: '✅', competitor: '❌', highlight: 'pl' },
    { label: 'Auto-publish & scheduling', pl: '✅', competitor: '✅' },
    ...indiaRows,
    { label: 'Repurpose engine (1 post → 5 formats)', pl: '✅', competitor: '❌', highlight: 'pl' },
    { label: 'Story bank (reusable lived experiences)', pl: '✅', competitor: '❌', highlight: 'pl' },
    { label: 'Hook & opening-line library', pl: '⚠️ Built into drafts', competitor: '✅ A core strength', highlight: 'competitor' },
    { label: 'Plan flexibility', pl: '✅ Free + 4 paid tiers', competitor: '⚠️ One plan only', highlight: 'pl' },
    { label: 'Free trial', pl: '✅ 7-day, no card', competitor: '⚠️ 3 sample posts, then 7-day trial' },
    { label: 'Cancel in one click', pl: '✅', competitor: '⚠️ Account settings' },
  ],
  honest: [
    {
      title: 'When EasyGen might be a better fit',
      body: 'EasyGen is built by a well-known LinkedIn creator and is genuinely strong at hooks and opening lines, with a simple one-click workflow. If you specifically want that creator-brand style engine and the $59.99/mo price is not a concern, it is a polished choice.',
    },
    {
      title: 'The price gap is the headline',
      body: `EasyGen is one plan at $59.99/mo — roughly ${inr(59.99 * rate)} once you add FX, with no GST invoice and no free tier. PersonaLink starts free, and its first paid tier is ${inr(PL_PLANS.starter.inr)}/mo with a GST invoice. For Indian creators that difference is most of the decision.`,
    },
  ],
  faq: [
    { q: 'Is PersonaLink cheaper than EasyGen?', a: `Substantially. EasyGen is a single plan at $59.99/month (about ${inr(59.99 * rate)} with FX), with no GST invoice and no free tier. PersonaLink starts free, and the first paid tier is ${inr(PL_PLANS.starter.inr)}/month billed in INR with a GST invoice.` },
    { q: 'Does EasyGen have a free plan?', a: 'No — you get 3 sample posts and then a 7-day trial, after which a subscription is required. PersonaLink has a permanent free tier (3 posts/month, one voice fingerprint, no card).' },
    { q: 'Does EasyGen bill in INR or give GST invoices?', a: 'No. EasyGen bills in USD and cannot issue an India GST invoice. PersonaLink bills in INR via Razorpay (UPI + cards) and puts a GSTIN on every invoice so you can claim input tax credit.' },
    { q: 'Does EasyGen write Hinglish posts?', a: 'No — EasyGen writes in English. PersonaLink natively writes code-mixed Hinglish without forcing translation.' },
    { q: 'Does EasyGen turn voice notes into posts?', a: 'No. PersonaLink lets you record a 2-minute voice note and returns a structured, polished LinkedIn post — EasyGen has no voice-note workflow.' },
    { q: 'Is EasyGen’s writing better than PersonaLink’s?', a: 'EasyGen is well-regarded for hooks and opening lines. PersonaLink constrains every draft to a 6-dimension fingerprint of your past posts so it reads like you. Both let you try before paying — PersonaLink free, EasyGen with 3 sample posts.' },
    { q: 'Can I schedule and auto-publish in EasyGen?', a: 'Yes — EasyGen has a content calendar for scheduling and publishing. PersonaLink also schedules and auto-publishes through official LinkedIn OAuth (posting-only access).' },
    { q: 'Who is EasyGen best for?', a: 'Creators who want a known creator-brand tool and are comfortable with USD pricing at $59.99/month. PersonaLink is built for India-based creators who want INR billing, GST invoices, and Hinglish at a much lower entry price.' },
    { q: 'Can I cancel anytime?', a: 'PersonaLink cancels in one click in Settings and you keep access to the end of the billing period. EasyGen subscriptions are cancellable from account settings.' },
  ],
  migration: [
    { title: 'Keep your EasyGen drafts', body: 'Copy any drafts you want to keep — then you can stop paying $59.99/mo once you have moved.' },
    { title: 'Sign up to PersonaLink', body: 'Connect with official LinkedIn OAuth and start on the free tier or a 7-day trial — no card required.' },
    { title: 'Paste 3 sample posts', body: 'We build your 6-dimension voice fingerprint in about 30 seconds, then you can draft in your voice and auto-publish.' },
  ],
  quote: {
    body: 'EasyGen wrote good hooks, but $59.99 a month with no GST invoice was a hard sell to my accountant. PersonaLink does the same job in rupees, and the Hinglish is a bonus.',
    name: '— Real testimonial coming soon',
    role: 'Founder · India (placeholder)',
  },
  }
}

/* ────────────────────────────────────────────────────────────────────
 * CONTENTIN
 * ──────────────────────────────────────────────────────────────────── */

function buildContentin(rate: number): Competitor {
  return {
  slug: 'contentin',
  name: 'ContentIn',
  oneLiner: 'A capable global LinkedIn ghostwriter — but USD-only, no Hinglish, and AI writing starts on its $31 plan.',
  pricingModel: 'recurring',
  plans: COMPETITOR_PLANS.contentin,
  hero: {
    subhead: 'A LinkedIn ghostwriter that finally fits India: INR billing, GST invoices, Hinglish — and voice notes → post.',
    headlineSavings: Math.round((31 * rate - PL_PLANS.standard.inr) * 12),
  },
  features: [
    { label: 'Entry price for AI writing in your voice', pl: `${inr(PL_PLANS.starter.inr)} (Starter)`, competitor: `${inr(31 * rate)} ($31 Growth)`, highlight: 'pl', note: 'ContentIn’s $15 Essentials plan schedules posts but has no AI writing — voice drafting starts on the $31 Growth plan.' },
    { label: 'Permanent free tier', pl: '✅ 3 posts/month free', competitor: '❌ Free trial only', highlight: 'pl' },
    { label: 'AI writing in your voice', pl: `✅ On every paid plan (from ${inr(PL_PLANS.starter.inr)})`, competitor: '✅ From the $31 Growth plan' },
    { label: 'Voice notes → post', pl: '✅', competitor: '❌', highlight: 'pl' },
    ...indiaRows,
    { label: 'Auto-publish & scheduling', pl: '✅', competitor: '✅' },
    { label: 'Post analytics', pl: '✅ What resonates', competitor: '✅ Full' },
    { label: 'Carousel generator', pl: '⚠️ Beta', competitor: '✅ From Growth', highlight: 'competitor' },
    { label: 'Viral template library', pl: '⚠️', competitor: '✅', highlight: 'competitor' },
    { label: 'AI comment assistant', pl: '❌', competitor: '✅', highlight: 'competitor' },
    { label: 'Repurpose engine (1 post → 5 formats)', pl: '✅', competitor: '⚠️', highlight: 'pl' },
    { label: 'Story bank (reusable lived experiences)', pl: '✅', competitor: '❌', highlight: 'pl' },
    { label: 'Official LinkedIn OAuth (posting-only)', pl: '✅', competitor: '✅' },
    { label: 'Cancel in one click', pl: '✅', competitor: '✅' },
  ],
  honest: [
    {
      title: 'When ContentIn might be a better fit',
      body: 'ContentIn is mature and feature-rich — viral templates, a strong carousel builder, an AI comment assistant, and full analytics, with 80+ public reviews behind it. If you are outside India (so INR/GST and Hinglish do not matter) and want the widest creator toolkit, it is a strong global option.',
    },
    {
      title: 'Where PersonaLink pulls ahead',
      body: `Two places. India fit — INR billing, GST invoices, Hinglish, and India-aware trends — and voice. PersonaLink includes its 6-dimension voice fingerprint on every paid plan from ${inr(PL_PLANS.starter.inr)}, whereas ContentIn gates AI writing to its $31 Growth plan, and PersonaLink adds voice notes → post, which ContentIn does not have.`,
    },
  ],
  faq: [
    { q: 'Is PersonaLink cheaper than ContentIn?', a: `For AI writing, yes. ContentIn’s voice writing starts on its $31/month Growth plan (about ${inr(31 * rate)} with FX); its $15 Essentials plan only schedules. PersonaLink includes the voice fingerprint from its ${inr(PL_PLANS.starter.inr)} Starter plan, billed in INR with a GST invoice, and has a free tier.` },
    { q: 'What does PersonaLink have that ContentIn does not?', a: 'INR billing, GST invoices, native Hinglish, India-aware trends, voice notes → post, and a story bank. ContentIn is built for the global English-speaking market and bills only in USD.' },
    { q: 'What does ContentIn do better than PersonaLink?', a: 'Honestly, a few things: its carousel builder, viral template library, and AI comment assistant are more mature today, and it has 80+ public reviews. If those matter more to you than India fit, ContentIn is a fair pick.' },
    { q: 'Does ContentIn bill in INR or issue GST invoices?', a: 'No — ContentIn bills in USD and does not provide India GST invoices. PersonaLink bills in INR via Razorpay and puts a GSTIN on every invoice.' },
    { q: 'Does ContentIn write Hinglish?', a: 'No. ContentIn writes in English. PersonaLink natively writes code-mixed Hinglish without forcing translation.' },
    { q: 'Does ContentIn have voice notes → post?', a: 'No. PersonaLink lets you record a voice note and returns a polished post; ContentIn has no voice-note workflow.' },
    { q: 'Is ContentIn LinkedIn-only, like PersonaLink?', a: 'Yes — both are built specifically for LinkedIn, so the comparison is genuinely like-for-like on platform. The differences are India fit, voice depth, and pricing model.' },
    { q: 'Will the posts sound like me?', a: 'With PersonaLink, every draft is constrained to a 6-dimension fingerprint of your past posts (rhythm, vocabulary, openings, pet phrases, warmth, punctuation). ContentIn also learns your voice on its Growth plan and above.' },
    { q: 'Can I cancel anytime?', a: 'Both let you cancel from settings. PersonaLink cancels in one click and you keep access to the end of the billing period.' },
  ],
  migration: [
    { title: 'Export your ContentIn content', body: 'Save any drafts and your scheduled queue from ContentIn.' },
    { title: 'Sign up to PersonaLink', body: 'Connect with official LinkedIn OAuth and start on the free tier or a 7-day trial — no card required.' },
    { title: 'Paste 3 sample posts', body: 'We build your 6-dimension voice fingerprint in about 30 seconds; email anything you want imported to migrate@personalink.in.' },
  ],
  quote: {
    body: 'ContentIn was the closest thing to what I wanted, but everything was in dollars and there was no Hinglish. PersonaLink felt built for an Indian founder — same kind of ghostwriting, rupee pricing, GST sorted.',
    name: '— Real testimonial coming soon',
    role: 'Consultant · India (placeholder)',
  },
  }
}

/* ────────────────────────────────────────────────────────────────────
 * MAGICPOST
 * ──────────────────────────────────────────────────────────────────── */

function buildMagicpost(rate: number): Competitor {
  return {
  slug: 'magicpost',
  name: 'MagicPost',
  oneLiner: 'India-domiciled, yet still billed in USD with no GST, UPI or Hinglish — and AI writing only from its $39 plan.',
  pricingModel: 'recurring',
  plans: COMPETITOR_PLANS.magicpost,
  hero: {
    subhead: 'An India-built LinkedIn tool that still bills in dollars. PersonaLink writes in your voice — in INR, with GST invoices, in Hinglish.',
    headlineSavings: Math.round((39 * rate - PL_PLANS.standard.inr) * 12),
  },
  features: [
    { label: 'Entry price for AI post generation', pl: `${inr(PL_PLANS.starter.inr)} (Starter)`, competitor: `${inr(39 * rate)} ($39 Creator)`, highlight: 'pl', note: 'MagicPost’s $21 Analytics plan covers LinkedIn metrics + manual scheduling only — AI post generation starts on the $39 Creator plan.' },
    { label: 'Cheapest paid plan', pl: inr(PL_PLANS.starter.inr), competitor: `${inr(21 * rate)} ($21, analytics only)` },
    { label: 'Permanent free tier', pl: '✅ 3 posts/month free', competitor: '⚠️ Free trial only (no card)', highlight: 'pl' },
    { label: 'AI writing in your voice', pl: `✅ On every paid plan (from ${inr(PL_PLANS.starter.inr)})`, competitor: '✅ From the $39 Creator plan' },
    { label: 'Voice notes → post', pl: '✅', competitor: '❌', highlight: 'pl' },
    ...indiaRows,
    { label: 'Auto-publish & scheduling', pl: '✅', competitor: '✅' },
    { label: 'LinkedIn analytics depth', pl: '✅ What resonates', competitor: '✅ Advanced (a core strength)', highlight: 'competitor' },
    { label: 'Free tools & post-idea library', pl: '⚠️ Built into the app', competitor: '✅ Large free-tools + idea library', highlight: 'competitor' },
    { label: 'Comment scheduling', pl: '❌', competitor: '✅', highlight: 'competitor' },
    { label: 'Repurpose engine (1 post → 5 formats)', pl: '✅', competitor: '⚠️', highlight: 'pl' },
    { label: 'Story bank (reusable lived experiences)', pl: '✅', competitor: '❌', highlight: 'pl' },
    { label: 'Official LinkedIn OAuth (posting-only)', pl: '✅', competitor: '✅' },
    { label: 'Cancel in one click', pl: '✅', competitor: '⚠️ Account settings' },
  ],
  honest: [
    {
      title: 'When MagicPost might be a better fit',
      body: 'MagicPost is genuinely strong on the analytics side — advanced LinkedIn metrics, comment scheduling, and a large library of free tools and post ideas. If your priority is measurement and inspiration rather than voice-matched writing, and INR, GST and Hinglish do not matter to you, it is a capable choice.',
    },
    {
      title: 'The irony: a .in tool that bills in USD',
      body: `MagicPost runs on a .in domain but still prices in US dollars ($21–$39/mo), with no GST invoice, no UPI, and no Hinglish. PersonaLink is the actually-India-native option — INR billing from ${inr(PL_PLANS.starter.inr)}, a GSTIN on every invoice, UPI/Razorpay, and native code-mixed Hinglish.`,
    },
  ],
  faq: [
    { q: 'Is PersonaLink cheaper than MagicPost?', a: `For AI writing, yes. MagicPost’s post generator starts on its $39/month Creator plan (about ${inr(39 * rate)} with FX); the $21 Analytics plan only does metrics and manual scheduling. PersonaLink includes the voice fingerprint from its ${inr(PL_PLANS.starter.inr)} Starter plan, billed in INR with a GST invoice, and has a free tier.` },
    { q: 'MagicPost uses a .in domain — does it bill in INR or give GST invoices?', a: 'No. Despite the .in domain, MagicPost prices in US dollars and does not offer INR billing, UPI, or an India GST invoice. PersonaLink bills in INR via Razorpay (UPI + cards) and puts a GSTIN on every invoice so you can claim 18% input tax credit.' },
    { q: 'Does MagicPost write Hinglish posts?', a: 'No — MagicPost writes in English. PersonaLink natively writes code-mixed Hinglish without forcing translation into pure English or Hindi.' },
    { q: 'Does MagicPost turn voice notes into posts?', a: 'No. PersonaLink lets you record a voice note and returns a polished, structured LinkedIn post in your voice — MagicPost has no voice-note workflow.' },
    { q: 'What does MagicPost do better than PersonaLink?', a: 'Honestly, a couple of things: its advanced LinkedIn analytics, comment scheduling, and its large library of free tools and post ideas are real strengths. If deep metrics and an idea library matter more to you than India fit and voice depth, MagicPost is a fair pick.' },
    { q: 'Does the AI write in my own voice?', a: 'PersonaLink constrains every draft to a 6-dimension fingerprint of your past posts (rhythm, vocabulary, openings, pet phrases, warmth, punctuation), so it reads like you. MagicPost’s generator is style and template based, and starts on its Creator plan.' },
    { q: 'Do both publish through official LinkedIn access?', a: 'Yes — both schedule and auto-publish, and PersonaLink connects through official LinkedIn OAuth with posting-only permission: it never reads your DMs, never scrapes your network, and never stores your password.' },
    { q: 'Is there a free way to try each?', a: 'MagicPost offers a free trial (no card) to generate a few posts. PersonaLink has a permanent free tier — 3 posts a month, one voice fingerprint, no card — so you can keep using it without paying.' },
    { q: 'Can I cancel anytime?', a: 'PersonaLink cancels in one click in Settings and you keep access to the end of the billing period. MagicPost subscriptions are cancellable from account settings.' },
  ],
  migration: [
    { title: 'Keep your MagicPost analytics if you use them', body: 'MagicPost and PersonaLink solve different jobs — keep MagicPost for metrics if you like it, and use PersonaLink for voice-matched writing and publishing.' },
    { title: 'Sign up to PersonaLink', body: 'Connect with official LinkedIn OAuth and start on the free tier or a 7-day trial — no card required.' },
    { title: 'Paste 3 sample posts', body: 'We build your 6-dimension voice fingerprint in about 30 seconds, then you can draft in your voice and auto-publish.' },
  ],
  quote: {
    body: 'I tried MagicPost because it looked Indian, but everything was priced in dollars with no GST invoice or Hinglish. PersonaLink actually fits how I pay and how I write.',
    name: '— Real testimonial coming soon',
    role: 'Founder · India (placeholder)',
  },
  }
}

/* ────────────────────────────────────────────────────────────────────
 * Registry
 * ──────────────────────────────────────────────────────────────────── */

export function getCompetitor(slug: CompetitorSlug, rate: number): Competitor {
  switch (slug) {
    case 'taplio': return buildTaplio(rate)
    case 'kleo': return buildKleo(rate)
    case 'supergrow': return buildSupergrow(rate)
    case 'authoredup': return buildAuthoredup(rate)
    case 'easygen': return buildEasygen(rate)
    case 'contentin': return buildContentin(rate)
    case 'magicpost': return buildMagicpost(rate)
  }
}

export function getAllCompetitors(rate: number): Competitor[] {
  return COMPETITOR_SLUGS.map(s => getCompetitor(s, rate))
}

/* ────────────────────────────────────────────────────────────────────
 * Year-1 cost helpers for the savings calculator
 * ──────────────────────────────────────────────────────────────────── */

export type YearOneBreakdown = {
  pl: { planName: string; monthlyInr: number; yearOneInr: number }
  competitor: { planName: string; yearOneInr: number; isLifetime: boolean }
  savingsInr: number
  /** True when Personalink is cheaper over Year 1. */
  plWins: boolean
}

export function calcYearOne(competitor: Competitor, postsPerMonth: number, rate: number): YearOneBreakdown {
  const plId = pickPlPlanFor(postsPerMonth)
  const plMonthly = PL_PLANS[plId].inr
  const plYear = plMonthly * 12

  const cPlan = pickCompetitorPlanFor(competitor, postsPerMonth)
  const cYear = competitor.pricingModel === 'lifetime'
    ? (cPlan.oneTimeUsd ?? 0) * rate
    : (cPlan.monthlyUsd ?? 0) * rate * 12

  return {
    pl: { planName: PL_PLANS[plId].name, monthlyInr: plMonthly, yearOneInr: plYear },
    competitor: { planName: cPlan.name, yearOneInr: cYear, isLifetime: competitor.pricingModel === 'lifetime' },
    savingsInr: cYear - plYear,
    plWins: cYear - plYear > 0,
  }
}
