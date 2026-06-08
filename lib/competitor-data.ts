/**
 * Single source of truth for /vs/* comparison pages.
 *
 * All competitor prices stored in USD; INR is computed at runtime against
 * USD_TO_INR so a single edit keeps every page accurate. Personalink prices
 * pull from `lib/currency.ts` so changes there propagate automatically.
 */

import { CURRENCIES } from '@/lib/currency'
import { TIER_LIMITS } from '@/lib/pricing-config'

export const USD_TO_INR = 84

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
  slug: 'taplio' | 'kleo' | 'supergrow'
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

const taplio: Competitor = {
  slug: 'taplio',
  name: 'Taplio',
  oneLiner: 'Polished feature set, but billed in USD with no Indian tax compliance.',
  pricingModel: 'recurring',
  plans: [
    { name: 'Standard', monthlyUsd: 39, postBudget: 30, seats: 1 },
    { name: 'Pro', monthlyUsd: 65, postBudget: 90, seats: 1 },
    { name: 'Agency', monthlyUsd: 199, postBudget: 300, seats: 5 },
  ],
  hero: {
    subhead: 'Same features. Pay in INR. Get GST invoices. Save up to {{save}}/year.',
    headlineSavings: Math.round((65 * USD_TO_INR - PL_PLANS.standard.inr) * 12),
  },
  features: [
    { label: 'Entry-level monthly price', pl: inr(PL_PLANS.starter.inr), competitor: `${inr(39 * USD_TO_INR)} ($39)`, highlight: 'pl' },
    { label: 'Mid-tier monthly price', pl: inr(PL_PLANS.standard.inr), competitor: `${inr(65 * USD_TO_INR)} ($65)`, highlight: 'pl' },
    { label: 'Top tier monthly price', pl: 'Custom (agency form)', competitor: `${inr(199 * USD_TO_INR)} ($199)`, highlight: 'pl' },
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
      a: `Yes. Taplio\'s Standard plan is $39/month (about ${inr(39 * USD_TO_INR)} at today\'s rates) plus FX fees. Personalink Standard is ${inr(PL_PLANS.standard.inr)}/month, billed in INR, GST-compliant. Annual savings on the mid-tier alone work out to roughly ${inr((65 * USD_TO_INR - PL_PLANS.standard.inr) * 12)}.`,
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

/* ────────────────────────────────────────────────────────────────────
 * KLEO
 * ──────────────────────────────────────────────────────────────────── */

const kleo: Competitor = {
  slug: 'kleo',
  name: 'Kleo',
  oneLiner: 'Lifetime deal up front. Static toolkit, no ongoing improvements.',
  pricingModel: 'lifetime',
  plans: [
    { name: 'Lifetime', monthlyUsd: null, oneTimeUsd: 99, postBudget: 999, seats: 1 },
  ],
  hero: {
    subhead: 'Recurring tool, lifetime value. Pay in INR. Get GST invoices. Built for India.',
    headlineSavings: 60000,
  },
  features: [
    { label: 'Pricing model', pl: 'Monthly subscription (cancel anytime)', competitor: 'One-time $99 lifetime' },
    { label: 'Entry price', pl: inr(PL_PLANS.starter.inr) + '/mo', competitor: `${inr(99 * USD_TO_INR)} once ($99)` },
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

/* ────────────────────────────────────────────────────────────────────
 * SUPERGROW
 * ──────────────────────────────────────────────────────────────────── */

const supergrow: Competitor = {
  slug: 'supergrow',
  name: 'Supergrow',
  oneLiner: 'Cheap and simple. Misses voice depth, India localisation, and auto-publish.',
  pricingModel: 'recurring',
  plans: [
    { name: 'Solo', monthlyUsd: 19, postBudget: 30, seats: 1 },
    { name: 'Pro', monthlyUsd: 39, postBudget: 90, seats: 1 },
  ],
  hero: {
    subhead: 'Roughly the same price. Twice the depth. Pay in INR. Get GST invoices.',
    headlineSavings: Math.round((19 * USD_TO_INR - PL_PLANS.starter.inr) * 12),
  },
  features: [
    { label: 'Entry-level monthly price', pl: inr(PL_PLANS.starter.inr), competitor: `${inr(19 * USD_TO_INR)} ($19)`, highlight: 'pl' },
    { label: 'Mid-tier monthly price', pl: inr(PL_PLANS.standard.inr), competitor: `${inr(39 * USD_TO_INR)} ($39)`, highlight: 'pl' },
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
      a: `On entry tier, yes — ${inr(PL_PLANS.starter.inr)}/mo vs Supergrow\'s ${inr(19 * USD_TO_INR)}/mo equivalent ($19 + FX + lack of GST credit). On Pro: ${inr(PL_PLANS.standard.inr)} vs ${inr(39 * USD_TO_INR)}. Personalink also recovers 18% GST as input tax credit for Indian businesses.`,
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

/* ────────────────────────────────────────────────────────────────────
 * Registry
 * ──────────────────────────────────────────────────────────────────── */

export const COMPETITORS = {
  taplio,
  kleo,
  supergrow,
} as const

export type CompetitorSlug = keyof typeof COMPETITORS
export const COMPETITOR_SLUGS = Object.keys(COMPETITORS) as CompetitorSlug[]

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

export function calcYearOne(competitor: Competitor, postsPerMonth: number): YearOneBreakdown {
  const plId = pickPlPlanFor(postsPerMonth)
  const plMonthly = PL_PLANS[plId].inr
  const plYear = plMonthly * 12

  const cPlan = pickCompetitorPlanFor(competitor, postsPerMonth)
  const cYear = competitor.pricingModel === 'lifetime'
    ? (cPlan.oneTimeUsd ?? 0) * USD_TO_INR
    : (cPlan.monthlyUsd ?? 0) * USD_TO_INR * 12

  return {
    pl: { planName: PL_PLANS[plId].name, monthlyInr: plMonthly, yearOneInr: plYear },
    competitor: { planName: cPlan.name, yearOneInr: cYear, isLifetime: competitor.pricingModel === 'lifetime' },
    savingsInr: cYear - plYear,
    plWins: cYear - plYear > 0,
  }
}
